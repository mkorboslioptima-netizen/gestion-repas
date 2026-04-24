using System.Net.NetworkInformation;
using System.Net.Sockets;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Services;

public class SupervisionChecker : ISupervisionChecker
{
    private readonly CantineDbContext _db;
    private readonly ISupervisionStore _store;

    public SupervisionChecker(CantineDbContext db, ISupervisionStore store)
    {
        _db = db;
        _store = store;
    }

    public async Task<CheckLecteurResult?> CheckLecteurAsync(int lecteurId, CancellationToken ct = default)
    {
        var l = await _db.Lecteurs
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == lecteurId, ct);

        if (l is null) return null;

        var lecteurKey = $"lecteur-{l.Id}";
        _store.Register(lecteurKey, l.Nom, l.AdresseIP, "lecteur");

        bool lecteurOk = await CheckConnectivityAsync(l.AdresseIP, 11020, ct);
        _store.UpdateStatus(lecteurKey, lecteurOk);
        var lecteurDto = _store.GetAll().First(s => s.Id == lecteurKey);

        EquipmentStatusDto? imprimanteDto = null;
        if (!string.IsNullOrWhiteSpace(l.PrinterIP))
        {
            var impKey = $"imprimante-{l.Id}";
            int port = l.PortImprimante > 0 ? l.PortImprimante : 9100;
            _store.Register(impKey, l.NomImprimante ?? l.PrinterIP, l.PrinterIP, "imprimante");
            bool impOk = await CheckConnectivityAsync(l.PrinterIP, port, ct);
            _store.UpdateStatus(impKey, impOk);
            imprimanteDto = _store.GetAll().FirstOrDefault(s => s.Id == impKey);
        }

        return new CheckLecteurResult(lecteurDto, imprimanteDto);
    }

    internal static async Task<bool> CheckConnectivityAsync(string host, int port, CancellationToken ct)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(host, 1000);
            if (reply.Status == IPStatus.Success)
                return true;
        }
        catch { /* ICMP filtré — fallback TCP */ }

        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(2));
        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(host, port, cts.Token);
            return true;
        }
        catch { return false; }
    }
}
