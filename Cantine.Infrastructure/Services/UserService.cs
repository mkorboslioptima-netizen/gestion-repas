using Cantine.Core.DTOs;
using Cantine.Core.Entities;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Services;

public class UserService : IUserService
{
    private readonly CantineDbContext _context;

    public UserService(CantineDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<AppUserDto>> GetAllAsync()
    {
        return await _context.AppUsers
            .AsNoTracking()
            .OrderBy(u => u.CreatedAt)
            .Select(u => new AppUserDto(u.Id, u.Email, u.Nom, u.Role, u.IsActive, u.CreatedAt, u.CreatedBy, u.SiteId))
            .ToListAsync();
    }

    public async Task<AppUserDto> CreateAsync(CreateUserDto dto, int actorId)
    {
        if (!UserRole.All.Contains(dto.Role))
            throw new ArgumentException($"Rôle invalide : {dto.Role}");

        if (await _context.AppUsers.AnyAsync(u => u.Email == dto.Email))
            throw new InvalidOperationException($"L'email {dto.Email} est déjà utilisé.");

        var actor = await _context.AppUsers.AsNoTracking().FirstAsync(u => u.Id == actorId);

        var user = new AppUser
        {
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Nom = dto.Nom,
            Role = dto.Role,
            SiteId = dto.SiteId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = actor.Email,
        };

        _context.AppUsers.Add(user);
        await _context.SaveChangesAsync();

        _context.UserAuditLogs.Add(new UserAuditLog
        {
            ActorId = actorId,
            Action = "Created",
            TargetUserId = user.Id,
            Timestamp = DateTime.UtcNow,
            Details = $"{{\"email\":\"{user.Email}\",\"role\":\"{user.Role}\"}}"
        });
        await _context.SaveChangesAsync();

        return new AppUserDto(user.Id, user.Email, user.Nom, user.Role, user.IsActive, user.CreatedAt, user.CreatedBy, user.SiteId);
    }

    public async Task UpdateRoleOrStatusAsync(int userId, UpdateUserDto dto, int actorId)
    {
        if (dto.IsActive == false && userId == actorId)
            throw new InvalidOperationException("Impossible de désactiver son propre compte.");

        var user = await _context.AppUsers.FirstAsync(u => u.Id == userId);

        string action;
        if (dto.Role is not null && dto.Role != user.Role)
        {
            if (!UserRole.All.Contains(dto.Role))
                throw new ArgumentException($"Rôle invalide : {dto.Role}");
            user.Role = dto.Role;
            action = "RoleChanged";
        }
        else if (dto.IsActive.HasValue && dto.IsActive.Value != user.IsActive)
        {
            user.IsActive = dto.IsActive.Value;
            action = dto.IsActive.Value ? "Reactivated" : "Deactivated";
        }
        else
        {
            return;
        }

        _context.UserAuditLogs.Add(new UserAuditLog
        {
            ActorId = actorId,
            Action = action,
            TargetUserId = userId,
            Timestamp = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
    }

    public async Task ResetPasswordAsync(int userId, string newPassword, int actorId)
    {
        var user = await _context.AppUsers.FirstAsync(u => u.Id == userId);
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        _context.UserAuditLogs.Add(new UserAuditLog
        {
            ActorId = actorId,
            Action = "PasswordReset",
            TargetUserId = userId,
            Timestamp = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<AuditLogDto>> GetAuditLogAsync(int count = 50)
    {
        return await _context.UserAuditLogs
            .AsNoTracking()
            .Include(l => l.Actor)
            .Include(l => l.TargetUser)
            .OrderByDescending(l => l.Timestamp)
            .Take(count)
            .Select(l => new AuditLogDto(
                l.Id,
                l.Actor != null ? l.Actor.Email : "?",
                l.Action,
                l.TargetUser != null ? l.TargetUser.Email : "?",
                l.Timestamp,
                l.Details
            ))
            .ToListAsync();
    }
}
