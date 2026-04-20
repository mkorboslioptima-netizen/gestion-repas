using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IUserService
{
    Task<IEnumerable<AppUserDto>> GetAllAsync();
    Task<AppUserDto> CreateAsync(CreateUserDto dto, int actorId);
    Task UpdateRoleOrStatusAsync(int userId, UpdateUserDto dto, int actorId);
    Task ResetPasswordAsync(int userId, string newPassword, int actorId);
    Task<IEnumerable<AuditLogDto>> GetAuditLogAsync(int count = 50);
}
