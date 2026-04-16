using Cantine.Core.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cantine.TcpListener;

public class MorphoSyncBackgroundService : BackgroundService
{
    private static readonly TimeSpan SyncInterval = TimeSpan.FromHours(6);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MorphoSyncBackgroundService> _logger;

    public MorphoSyncBackgroundService(
        IServiceScopeFactory scopeFactory,
        ILogger<MorphoSyncBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[Sync Morpho] Service démarré — synchronisation toutes les {H}h.", SyncInterval.TotalHours);

        // Première synchro au démarrage du service
        await RunSyncAsync(stoppingToken);

        using var timer = new PeriodicTimer(SyncInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await RunSyncAsync(stoppingToken);
        }
    }

    private async Task RunSyncAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var syncService = scope.ServiceProvider.GetRequiredService<IMorphoSyncService>();
        try
        {
            _logger.LogInformation("[Sync Morpho] Déclenchement synchronisation automatique...");
            var resultats = await syncService.SyncAllSitesAsync(ct);
            _logger.LogInformation("[Sync Morpho] Synchronisation terminée — {N} site(s) traité(s).", resultats.Count);
        }
        catch (OperationCanceledException)
        {
            // Arrêt normal
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Sync Morpho] Erreur inattendue lors de la synchronisation automatique.");
        }
    }
}
