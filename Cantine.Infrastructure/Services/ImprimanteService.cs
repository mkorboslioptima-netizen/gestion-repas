using System.Diagnostics;
using System.Net.Sockets;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Services;

public class ImprimanteService : IImprimanteService
{
    private readonly CantineDbContext _context;
    private readonly ILogger<ImprimanteService> _logger;

    public ImprimanteService(CantineDbContext context, ILogger<ImprimanteService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<ImprimanteDto>> GetAllAsync()
    {
        var lecteurs = await _context.Lecteurs
            .AsNoTracking()
            .OrderBy(l => l.SiteId).ThenBy(l => l.Nom)
            .ToListAsync();

        return lecteurs.Select(l => new ImprimanteDto(
            l.Id, l.Nom, l.SiteId,
            l.NomImprimante, l.PrinterIP, l.PortImprimante,
            !string.IsNullOrWhiteSpace(l.PrinterIP)
        ));
    }

    public async Task<ImprimanteDto> UpdateAsync(int lecteurId, UpdateImprimanteDto dto)
    {
        var lecteur = await _context.Lecteurs.FindAsync(lecteurId)
            ?? throw new KeyNotFoundException($"Lecteur {lecteurId} introuvable");

        lecteur.NomImprimante = dto.NomImprimante;
        lecteur.PrinterIP = dto.PrinterIP;
        lecteur.PortImprimante = dto.PortImprimante > 0 ? dto.PortImprimante : 9100;

        await _context.SaveChangesAsync();

        return new ImprimanteDto(
            lecteur.Id, lecteur.Nom, lecteur.SiteId,
            lecteur.NomImprimante, lecteur.PrinterIP, lecteur.PortImprimante,
            !string.IsNullOrWhiteSpace(lecteur.PrinterIP)
        );
    }

    public async Task<TestImprimanteResultDto> TestConnexionAsync(int lecteurId)
    {
        var lecteur = await _context.Lecteurs
            .AsNoTracking()
            .FirstOrDefaultAsync(l => l.Id == lecteurId)
            ?? throw new KeyNotFoundException($"Lecteur {lecteurId} introuvable");

        if (string.IsNullOrWhiteSpace(lecteur.PrinterIP))
            return new TestImprimanteResultDto(false, "Aucune adresse IP configurée", null);

        var sw = Stopwatch.StartNew();
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(lecteur.PrinterIP, lecteur.PortImprimante)
                .WaitAsync(TimeSpan.FromSeconds(3));
            sw.Stop();
            return new TestImprimanteResultDto(true,
                $"Connexion réussie à {lecteur.PrinterIP}:{lecteur.PortImprimante}",
                (int)sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogWarning("[Test imprimante] Lecteur {Id}: {Message}", lecteurId, ex.Message);
            return new TestImprimanteResultDto(false,
                $"Impossible de joindre {lecteur.PrinterIP}:{lecteur.PortImprimante} — {ex.Message}",
                null);
        }
    }
}
