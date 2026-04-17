namespace Cantine.Core.DTOs;

public class EmployeeSiteStatsDto
{
    public string SiteId { get; set; } = string.Empty;
    public string NomSite { get; set; } = string.Empty;
    public int TotalActifs { get; set; }
    public SyncLogDto? DerniereSynchro { get; set; }
}
