using Cantine.Core.Enums;

namespace Cantine.Core.Entities;

public class MealLog
{
    public int Id { get; set; }
    public string SiteId { get; set; } = string.Empty;
    public string Matricule { get; set; } = string.Empty;
    public int LecteurId { get; set; }
    public DateTime Timestamp { get; set; }
    public RepasType RepasType { get; set; }
    // TicketNumber = Id (pas de colonne séparée en Phase 1)
    public int TicketNumber => Id;

    public Employee? Employee { get; set; }
    public Lecteur? Lecteur { get; set; }
}
