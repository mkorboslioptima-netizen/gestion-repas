using Cantine.Core.Interfaces;

namespace Cantine.API.Services;

/// <summary>
/// Implémentation de ISiteContext pour les requêtes HTTP.
/// Lit le claim "siteId" du JWT. Si absent (AdminSEBN global), retourne null.
/// </summary>
public class HttpSiteContext : ISiteContext
{
    public string? SiteId { get; }

    public HttpSiteContext(IHttpContextAccessor httpContextAccessor)
    {
        SiteId = httpContextAccessor.HttpContext?.User.FindFirst("siteId")?.Value;
    }
}
