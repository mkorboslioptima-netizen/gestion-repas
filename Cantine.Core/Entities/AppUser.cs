namespace Cantine.Core.Entities;

public class AppUser
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // "AdminSEBN" | "ResponsableCantine"
    public string? SiteId { get; set; }

    public Site? Site { get; set; }
}
