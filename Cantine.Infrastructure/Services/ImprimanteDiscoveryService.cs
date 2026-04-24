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

    public ImprimanteDiscoveryService(ILogger<ImprimanteDiscoveryService> logger)
    {
        _logger = logger;
    }

    public async Task<IEnumerable<ImprimanteDiscoveredDto>> DiscoverAsync()
    {
        var windows = DiscoverWindowsPrinters();
        var network = await ScanNetworkAsync();

        var all = windows.Concat(network)
            .GroupBy(d => d.AdresseIP)
            .Select(g => g.OrderBy(d => d.Source == "windows" ? 0 : 1).First())
            .OrderBy(d => d.AdresseIP)
            .ToList();

        _logger.LogInformation("[Discovery] {Count} imprimante(s) découverte(s)", all.Count);
        return all;
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

    private async Task<IEnumerable<ImprimanteDiscoveredDto>> ScanNetworkAsync()
    {
        var localAddress = NetworkInterface.GetAllNetworkInterfaces()
            .Where(n => n.OperationalStatus == OperationalStatus.Up
                     && n.NetworkInterfaceType != NetworkInterfaceType.Loopback)
            .SelectMany(n => n.GetIPProperties().UnicastAddresses)
            .FirstOrDefault(a => a.Address.AddressFamily == AddressFamily.InterNetwork
                              && !IPAddress.IsLoopback(a.Address));

        if (localAddress is null)
        {
            _logger.LogWarning("[Discovery] Aucune interface réseau locale détectée");
            return [];
        }

        var parts = localAddress.Address.ToString().Split('.');
        var prefix = $"{parts[0]}.{parts[1]}.{parts[2]}";

        _logger.LogInformation("[Discovery] Scan réseau {Prefix}.1-254 port 9100...", prefix);

        var tasks = Enumerable.Range(1, 254).Select(async i =>
        {
            var ip = $"{prefix}.{i}";
            try
            {
                using var client = new TcpClient();
                await client.ConnectAsync(ip, 9100).WaitAsync(TimeSpan.FromMilliseconds(300));
                return new ImprimanteDiscoveredDto(ip, null, "reseau");
            }
            catch { return null; }
        });

        var results = await Task.WhenAll(tasks);
        return results.Where(r => r is not null).Cast<ImprimanteDiscoveredDto>();
    }
}
