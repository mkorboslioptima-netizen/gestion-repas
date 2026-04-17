using Cantine.Core.DTOs;
using Cantine.Core.Entities;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.MorphoManager;

public class MorphoEmployeeImporter : IMorphoEmployeeImporter
{
    private readonly CantineDbContext _context;
    private readonly ILogger<MorphoEmployeeImporter> _logger;

    public MorphoEmployeeImporter(CantineDbContext context, ILogger<MorphoEmployeeImporter> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<ImportResultDto> ImportAsync(string siteId, bool desactiverAbsents = false, string source = "Manual")
    {
        var config = await _context.MorphoConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.SiteId == siteId);

        if (config is null)
            throw new InvalidOperationException($"MorphoConfig non trouvée pour le site '{siteId}'. Configurez la connexion MorphoManager dans la page Sites.");

        var result = new ImportResultDto();

        await using var connection = new SqlConnection(config.ConnectionString);
        await connection.OpenAsync();

        await using var command = new SqlCommand(config.Query, connection)
        {
            CommandTimeout = config.CommandTimeout
        };

        await using var reader = await command.ExecuteReaderAsync();

        var rows = new List<(string Matricule, string Nom, string Prenom)>();
        while (await reader.ReadAsync())
        {
            var matricule = reader["Matricule"]?.ToString()?.Trim();
            var nom = reader["Nom"]?.ToString()?.Trim();
            var prenom = reader["Prenom"]?.ToString()?.Trim();

            if (string.IsNullOrEmpty(matricule)) continue;
            rows.Add((matricule, nom ?? string.Empty, prenom ?? string.Empty));
        }

        await reader.CloseAsync();

        // 2.3 — Sécurité : ne jamais désactiver si la liste est vide
        if (desactiverAbsents && rows.Count == 0)
        {
            _logger.LogWarning("[Import Morpho] Site {SiteId} — résultat vide, désactivation ignorée.", siteId);
            desactiverAbsents = false;
        }

        var matriculesMorpho = rows.Select(r => r.Matricule).ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Upsert
        foreach (var (matricule, nom, prenom) in rows)
        {
            var existing = await _context.Employees
                .FirstOrDefaultAsync(e => e.SiteId == siteId && e.Matricule == matricule);

            if (existing is null)
            {
                _context.Employees.Add(new Employee
                {
                    SiteId = siteId,
                    Matricule = matricule,
                    Nom = nom,
                    Prenom = prenom,
                    MaxMealsPerDay = 1,
                    Actif = true
                });
                result.Importes++;
            }
            else
            {
                // Réactiver si désactivé et de nouveau présent dans Morpho
                bool changed = existing.Nom != nom || existing.Prenom != prenom || !existing.Actif;
                if (changed)
                {
                    existing.Nom = nom;
                    existing.Prenom = prenom;
                    existing.Actif = true;
                    result.MisAJour++;
                }
                else
                {
                    result.Ignores++;
                }
            }
        }

        // 2.4 — Désactivation des absents (synchro auto uniquement)
        if (desactiverAbsents)
        {
            var absents = await _context.Employees
                .Where(e => e.SiteId == siteId && e.Actif)
                .ToListAsync();

            foreach (var absent in absents.Where(e => !matriculesMorpho.Contains(e.Matricule)))
            {
                absent.Actif = false;
                result.Desactives++;
            }
        }

        _context.SyncLogs.Add(new Core.Entities.SyncLog
        {
            SiteId = siteId,
            OccurredAt = DateTime.UtcNow,
            Source = source,
            Importes = result.Importes,
            MisAJour = result.MisAJour,
            Desactives = result.Desactives,
            Ignores = result.Ignores
        });

        await _context.SaveChangesAsync();

        _logger.LogInformation(
            "[Import Morpho] Site {SiteId} — importés: {I}, màj: {U}, désactivés: {D}, ignorés: {S}",
            siteId, result.Importes, result.MisAJour, result.Desactives, result.Ignores);

        return result;
    }
}
