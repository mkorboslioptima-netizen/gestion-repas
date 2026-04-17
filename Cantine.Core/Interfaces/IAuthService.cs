using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IAuthService
{
    Task<LoginResultDto?> LoginAsync(LoginDto dto);
}
