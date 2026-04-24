using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public record CheckLecteurResult(EquipmentStatusDto Lecteur, EquipmentStatusDto? Imprimante);

public interface ISupervisionChecker
{
    Task<CheckLecteurResult?> CheckLecteurAsync(int lecteurId, CancellationToken ct = default);
}
