using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IShiftService
{
    Task<IEnumerable<ShiftDto>> GetAllAsync();
    Task<ShiftDto?> GetCurrentAsync(DateTime now);
    Task<ShiftDto> UpdateAsync(int id, UpdateShiftDto dto);
}
