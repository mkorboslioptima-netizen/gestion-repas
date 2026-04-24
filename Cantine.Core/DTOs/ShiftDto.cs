namespace Cantine.Core.DTOs;

public record ShiftDto(
    int Id,
    string Nom,
    TimeOnly HeureDebut,
    TimeOnly HeureFin,
    bool Actif,
    bool EnCours
);

public record UpdateShiftDto(
    TimeOnly HeureDebut,
    TimeOnly HeureFin,
    bool Actif
);
