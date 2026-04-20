namespace Cantine.Core.DTOs;

public class SiteDto
{
    public string SiteId { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public int EmployeCount { get; set; }
}

public class CreateSiteDto
{
    public string SiteId { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
}

public class UpdateSiteDto
{
    public string Nom { get; set; } = string.Empty;
    public bool Actif { get; set; }
}
