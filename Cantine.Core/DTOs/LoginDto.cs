namespace Cantine.Core.DTOs;

public class LoginDto
{
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class LoginResultDto
{
    public string Token { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? SiteId { get; set; }
}
