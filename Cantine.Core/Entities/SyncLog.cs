namespace Cantine.Core.Entities;

public class SyncLog
{
    public int Id { get; set; }
    public string SiteId { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public string Source { get; set; } = string.Empty; // "Manual" | "Auto"
    public int Importes { get; set; }
    public int MisAJour { get; set; }
    public int Desactives { get; set; }
    public int Ignores { get; set; }

    public Site? Site { get; set; }
}
