namespace Cantine.Core.DTOs;

public record AppUserDto(
    int Id,
    string Email,
    string Nom,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    string? CreatedBy,
    string? SiteId,
    string? SiteNom,
    DateTime? LastLoginAt
);

public record CreateUserDto(
    string Email,
    string Password,
    string Nom,
    string Role,
    string? SiteId
);

public record UpdateUserDto(
    string? Role,
    bool? IsActive,
    string? SiteId
);

public record AuditLogDto(
    int Id,
    string ActorEmail,
    string Action,
    string TargetEmail,
    DateTime Timestamp,
    string? Details
);
