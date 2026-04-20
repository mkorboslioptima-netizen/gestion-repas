namespace Cantine.Core.DTOs;

public record AppUserDto(
    int Id,
    string Email,
    string Nom,
    string Role,
    bool IsActive,
    DateTime CreatedAt,
    string? CreatedBy,
    string? SiteId
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
    bool? IsActive
);

public record AuditLogDto(
    int Id,
    string ActorEmail,
    string Action,
    string TargetEmail,
    DateTime Timestamp,
    string? Details
);
