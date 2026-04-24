namespace Cantine.Core.Entities;

public class Lecteur
{
    public int Id { get; set; }
    public string SiteId { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; } = true;
    public string? PrinterIP { get; set; }
    public string? NomImprimante { get; set; }
    public int PortImprimante { get; set; } = 9100;

    public Site? Site { get; set; }
}
