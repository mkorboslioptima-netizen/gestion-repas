using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace Cantine.Infrastructure.MorphoManager;

public class MorphoSyncService : IMorphoSyncService
{
    private readonly CantineDbContext _context;
    private readonly IMorphoEmployeeImporter _importer;
    private readonly ILogger<MorphoSyncService> _logger;

    public MorphoSyncService(
        CantineDbContext context,
        IMorphoEmployeeImporter importer,
        ILogger<MorphoSyncService> logger)
    {
        _context = context;
        _importer = importer;
        _logger = logger;
    }

    public async Task<IReadOnlyList<(string SiteId, ImportResultDto? Result, string? Erreur)>> SyncAllSitesAsync(CancellationToken ct = default)
    {
        // Tous les sites actifs ayant une MorphoConfig configurée
        var sitesAvecConfig = await _context.MorphoConfigs
            .AsNoTracking()
            .Join(_context.Sites.Where(s => s.Actif),
                  mc => mc.SiteId,
                  s => s.SiteId,
                  (mc, s) => mc.SiteId)
            .ToListAsync(ct);

        var resultats = new List<(string, ImportResultDto?, string?)>();

        foreach (var siteId in sitesAvecConfig)
        {
            if (ct.IsCancellationRequested) break;

            var sw = Stopwatch.StartNew();
            try
            {
                _logger.LogInformation("[Sync Morpho] Démarrage synchronisation site {SiteId}...", siteId);
                var result = await _importer.ImportAsync(siteId, desactiverAbsents: true, source: "Auto");
                sw.Stop();

                _logger.LogInformation(
                    "[Sync Morpho] {SiteId} — importés: {I}, màj: {U}, désactivés: {D}, ignorés: {S} ({Ms}ms)",
                    siteId, result.Importes, result.MisAJour, result.Desactives, result.Ignores, sw.ElapsedMilliseconds);

                resultats.Add((siteId, result, null));
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogWarning("[Sync Morpho] {SiteId} — ERREUR connexion : {Message}", siteId, ex.Message);
                resultats.Add((siteId, null, ex.Message));
            }
        }

        return resultats.AsReadOnly();
    }
}
