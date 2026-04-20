using System.Security.Claims;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    // POST /api/auth/login
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Email et mot de passe obligatoires." });

        var result = await _authService.LoginAsync(dto);
        if (result is null)
            return Unauthorized(new { message = "Email ou mot de passe incorrect." });

        if (result.Error is not null)
            return Unauthorized(new { message = result.Error });

        return Ok(result);
    }

    // GET /api/auth/me
    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        var email = User.FindFirstValue(ClaimTypes.NameIdentifier)
                 ?? User.FindFirstValue("sub")
                 ?? User.Identity?.Name;
        var nom   = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("name");
        var role  = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role");
        var siteId = User.FindFirstValue("siteId");

        return Ok(new { email, nom, role, siteId });
    }
}
