namespace Cantine.Core.DTOs;

public record EquipmentStatusDto(
    string Id,
    string Nom,
    string AdresseIP,
    string Type,
    bool Connecte,
    DateTime DernierCheck
);
