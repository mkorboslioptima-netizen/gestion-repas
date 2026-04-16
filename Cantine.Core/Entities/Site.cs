namespace Cantine.Core.Entities;

public class Site
{
    public string SiteId { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public bool Actif { get; set; } = true;
}
