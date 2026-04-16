using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface ILecteurService
{
    Task<IEnumerable<LecteurDto>> GetAllAsync();
    Task<LecteurDto?> GetByIdAsync(int id);
    Task<LecteurDto> CreateAsync(CreateLecteurDto dto);
    Task<LecteurDto> UpdateAsync(int id, UpdateLecteurDto dto);
    Task DeleteAsync(int id);
}
