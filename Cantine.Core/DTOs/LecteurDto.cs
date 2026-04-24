namespace Cantine.Core.DTOs;

public class LecteurDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public string? NomImprimante { get; set; }
    public string? PrinterIP { get; set; }
    public int PortImprimante { get; set; }
    public bool ImprimanteConfiguree { get; set; }
}

public class CreateLecteurDto
{
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public string SiteId { get; set; } = string.Empty;
}

public class UpdateLecteurDto
{
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public string? NomImprimante { get; set; }
    public string? PrinterIP { get; set; }
    public int PortImprimante { get; set; } = 9100;
}
