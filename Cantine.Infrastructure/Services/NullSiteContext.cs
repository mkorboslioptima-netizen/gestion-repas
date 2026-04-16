using Cantine.Core.Interfaces;

namespace Cantine.Infrastructure.Services;

/// <summary>
/// Implémentation de ISiteContext pour les contextes sans requête HTTP (Windows Service, jobs planifiés).
/// SiteId = null → accès global à tous les sites. Le filtrage est fait explicitement par les services appelants.
/// </summary>
public class NullSiteContext : ISiteContext
{
    public string? SiteId => null;
}
