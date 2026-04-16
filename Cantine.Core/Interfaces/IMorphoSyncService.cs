using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IMorphoSyncService
{
    /// <summary>
    /// Synchronise tous les sites actifs ayant une MorphoConfig.
    /// Désactive les employés absents de MorphoManager.
    /// </summary>
    Task<IReadOnlyList<(string SiteId, ImportResultDto? Result, string? Erreur)>> SyncAllSitesAsync(CancellationToken ct = default);
}
