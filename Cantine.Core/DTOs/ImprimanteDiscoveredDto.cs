namespace Cantine.Core.DTOs;

public record ImprimanteDiscoveredDto(
    string AdresseIP,
    string? NomImprimante,
    string Source,
    string? SousReseau = null,
    int Port = 9100
);
