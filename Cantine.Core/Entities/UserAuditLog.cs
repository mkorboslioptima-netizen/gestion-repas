namespace Cantine.Core.Entities;

public class UserAuditLog
{
    public int Id { get; set; }
    public int ActorId { get; set; }
    public string Action { get; set; } = string.Empty; // "Created" | "RoleChanged" | "Deactivated" | "PasswordReset" | "Reactivated"
    public int TargetUserId { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string? Details { get; set; } // JSON

    public AppUser? Actor { get; set; }
    public AppUser? TargetUser { get; set; }
}
