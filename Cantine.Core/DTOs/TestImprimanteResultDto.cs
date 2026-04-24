namespace Cantine.Core.DTOs;

public record TestImprimanteResultDto(
    bool Succes,
    string Message,
    int? LatenceMs
);
