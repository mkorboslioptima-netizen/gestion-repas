using System.Security.Claims;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/auth/users")]
[Authorize(Roles = "AdminSEBN")]
public class UsersController : ControllerBase
{
    private readonly IUserService _userService;

    public UsersController(IUserService userService)
    {
        _userService = userService;
    }

    // GET /api/auth/users
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var users = await _userService.GetAllAsync();
        return Ok(users);
    }

    // GET /api/auth/users/audit-log
    [HttpGet("audit-log")]
    public async Task<IActionResult> GetAuditLog()
    {
        var logs = await _userService.GetAuditLogAsync(50);
        return Ok(logs);
    }

    // POST /api/auth/users
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.Role))
            return BadRequest(new { message = "Email, mot de passe et rôle sont obligatoires." });

        var actorId = GetCurrentUserId();
        if (actorId is null) return Unauthorized();

        try
        {
            var user = await _userService.CreateAsync(dto, actorId.Value);
            return Created($"/api/auth/users/{user.Id}", user);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // PUT /api/auth/users/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserDto dto)
    {
        var actorId = GetCurrentUserId();
        if (actorId is null) return Unauthorized();

        try
        {
            await _userService.UpdateRoleOrStatusAsync(id, dto, actorId.Value);
            return Ok();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    // POST /api/auth/users/{id}/reset-password
    [HttpPost("{id:int}/reset-password")]
    public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword))
            return BadRequest(new { message = "Le nouveau mot de passe est obligatoire." });

        var actorId = GetCurrentUserId();
        if (actorId is null) return Unauthorized();

        await _userService.ResetPasswordAsync(id, dto.NewPassword, actorId.Value);
        return Ok();
    }

    private int? GetCurrentUserId()
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
        // The sub claim is the email; we need to resolve the user ID via the service
        // We store the user ID as a custom claim "uid" if available
        var uid = User.FindFirstValue("uid");
        return int.TryParse(uid, out var id) ? id : null;
    }
}

public record ResetPasswordDto(string NewPassword);
