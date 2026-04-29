using System.Management;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using Cantine.Core.DTOs;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Services;

public class ImprimanteDiscoveryService
{
    private readonly ILogger<ImprimanteDiscoveryService> _logger;

    private static readonly int[] _ports = [9100, 515, 631];

    public ImprimanteDiscoveryService(ILogger<ImprimanteDiscoveryService> logger)
    {
        _logger = logger;
    }

    public async Task<(IEnumerable<ImprimanteDiscoveredDto> Results, int SubnetCount)> DiscoverAsync()
    {
        var windows = DiscoverWindowsPrinters();
        var (network, subnetCount) = await ScanNetworkAsync();

        var all = windows.Concat(network)
            .GroupBy(d => d.AdresseIP)
            .Select(g => g.OrderBy(d => d.Source == "windows" ? 0 : 1).First())
            .OrderBy(d => d.AdresseIP)
            .ToList();

        _logger.LogInformation("[Discovery] {Count} imprimante(s) découverte(s) sur {Subnets} sous-réseau(x)",
            all.Count, subnetCount);

        return (all, subnetCount);
    }

    private IEnumerable<ImprimanteDiscoveredDto> DiscoverWindowsPrinters()
    {
        var results = new List<ImprimanteDiscoveredDto>();
        try
        {
            using var searcher = new ManagementObjectSearcher(
                "SELECT Name, HostAddress FROM Win32_TCPIPPrinterPort");
            foreach (ManagementObject port in searcher.Get())
            {
                var ip = port["HostAddress"]?.ToString();
                var name = port["Name"]?.ToString();
                if (!string.IsNullOrWhiteSpace(ip))
                    results.Add(new ImprimanteDiscoveredDto(ip, name, "windows"));
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("[Discovery] WMI non disponible : {Message}", ex.Message);
        }
        return results;
    }

    private async Task<(IEnumerable<ImprimanteDiscoveredDto> Results, int SubnetCount)> ScanNetworkAsync()
    {
        var prefixes = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up
                     && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .Where(a => a.Address.AddressFamily == AddressFamily.InterNetwork
                     && !IPAddress.IsLoopback(a.Address)
                     && a.PrefixLength < 31                          // exclure /31 et /32 (liaisons point-à-point)
                     && !a.Address.ToString().StartsWith("169.254")) // exclure link-local
            .Select(a => {
                var p = a.Address.ToString().Split('.');
                return $"{p[0]}.{p[1]}.{p[2]}";
            })
            .Distinct()
            .ToList();

        if (prefixes.Count == 0)
        {
            _logger.LogWarning("[Discovery] Aucune interface réseau active détectée");
            return ([], 0);
        }

        _logger.LogInformation("[Discovery] Scan sur {Count} sous-réseau(x) : {Prefixes} — ports {Ports}",
            prefixes.Count,
            string.Join(", ", prefixes.Select(p => p + ".0/24")),
            string.Join("/", _ports));

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        var allTasks = prefixes.SelectMany(prefix =>
            Enumerable.Range(1, 254).SelectMany(i =>
                _ports.Select(async port =>
                {
                    var ip = $"{prefix}.{i}";
                    try
                    {
                        using var client = new TcpClient();
                        await client.ConnectAsync(ip, port)
                            .WaitAsync(TimeSpan.FromMilliseconds(500), cts.Token);
                        return new ImprimanteDiscoveredDto(ip, null, "reseau",
                            SousReseau: $"{prefix}.x", Port: port);
                    }
                    catch { return null; }
                })
            )
        );

        ImprimanteDiscoveredDto?[] raw;
        try
        {
            raw = await Task.WhenAll(allTasks);
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("[Discovery] Scan interrompu après 30 secondes");
            raw = [];
        }

        // Pour une même IP, conserver le port le plus prioritaire : 9100 > 515 > 631
        var results = raw
            .Where(r => r is not null)
            .Cast<ImprimanteDiscoveredDto>()
            .GroupBy(r => r.AdresseIP)
            .Select(g => g.OrderBy(r => Array.IndexOf(_ports, r.Port)).First());

        return (results, prefixes.Count);
    }
}
