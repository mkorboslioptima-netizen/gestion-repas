namespace Cantine.Core.DTOs;

public record UpdateImprimanteDto(
    string? NomImprimante,
    string? PrinterIP,
    int PortImprimante
);
