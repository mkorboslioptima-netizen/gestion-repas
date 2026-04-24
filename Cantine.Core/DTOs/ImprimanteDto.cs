namespace Cantine.Core.DTOs;

public record ImprimanteDto(
    int LecteurId,
    string NomLecteur,
    string SiteId,
    string? NomImprimante,
    string? PrinterIP,
    int PortImprimante,
    bool Configuree
);
