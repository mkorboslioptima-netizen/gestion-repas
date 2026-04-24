using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IImprimanteService
{
    Task<IEnumerable<ImprimanteDto>> GetAllAsync();
    Task<ImprimanteDto> UpdateAsync(int lecteurId, UpdateImprimanteDto dto);
    Task<TestImprimanteResultDto> TestConnexionAsync(int lecteurId);
}
