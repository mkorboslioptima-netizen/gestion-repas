using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Services;

public class SupervisionBackgroundService : BackgroundService
{
    private readonly ISupervisionStore _store;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SupervisionBackgroundService> _logger;

    public SupervisionBackgroundService(
        ISupervisionStore store,
        IServiceScopeFactory scopeFactory,
        ILogger<SupervisionBackgroundService> logger)
    {
        _store = store;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));

        do
        {
            try
            {
                await CheckAllEquipmentsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "[Supervision] Erreur lors du cycle de vérification");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task CheckAllEquipmentsAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CantineDbContext>();
        var checker = scope.ServiceProvider.GetRequiredService<ISupervisionChecker>();

        var lecteurIds = await db.Lecteurs
            .Where(l => l.Actif)
            .Select(l => l.Id)
            .ToListAsync(ct);

        foreach (var id in lecteurIds)
        {
            await checker.CheckLecteurAsync(id, ct);
        }

        _logger.LogDebug("[Supervision] Cycle terminé — {Count} lecteurs vérifiés", lecteurIds.Count);
    }
}
