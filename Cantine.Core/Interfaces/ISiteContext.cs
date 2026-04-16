namespace Cantine.Core.Interfaces;

public interface ISiteContext
{
    /// <summary>
    /// SiteId de l'utilisateur courant. Null = AdminSEBN (accès global tous sites).
    /// </summary>
    string? SiteId { get; }
}
