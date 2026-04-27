namespace Cantine.Core.DTOs;

public record MealLogDto(
    int Id,
    string Matricule,
    string NomEmploye,
    string PrenomEmploye,
    string SiteId,
    string SiteNom,
    string LecteurNom,
    string RepasType,
    DateTime Timestamp
);

public record HistoriquePageDto(
    IEnumerable<MealLogDto> Items,
    int Total,
    int Page,
    int PageSize
);
