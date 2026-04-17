namespace Cantine.Core.DTOs;

public class RepasStatsDto
{
    public string SiteId { get; set; } = string.Empty;
    public string NomSite { get; set; } = string.Empty;
    public int TotalPassages { get; set; }
    public int PlatChaud { get; set; }
    public int Sandwich { get; set; }
    public int QuotaAtteint { get; set; }
}
