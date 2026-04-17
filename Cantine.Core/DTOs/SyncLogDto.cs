namespace Cantine.Core.DTOs;

public class SyncLogDto
{
    public int Id { get; set; }
    public string SiteId { get; set; } = string.Empty;
    public string NomSite { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Source { get; set; } = string.Empty;
    public int Importes { get; set; }
    public int MisAJour { get; set; }
    public int Desactives { get; set; }
    public int Ignores { get; set; }
}
