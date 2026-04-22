using Cantine.Core.Enums;

namespace Cantine.Core.DTOs;

public class PassageDto
{
    public int Id { get; set; }
    public string Matricule { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public RepasType RepasType { get; set; }
    public string LecteurNom { get; set; } = string.Empty;
    public string SiteId { get; set; } = string.Empty;
}
