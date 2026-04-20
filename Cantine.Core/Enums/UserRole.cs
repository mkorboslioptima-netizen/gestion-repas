namespace Cantine.Core.Enums;

public static class UserRole
{
    public const string AdminSEBN = "AdminSEBN";
    public const string ResponsableCantine = "ResponsableCantine";
    public const string Prestataire = "Prestataire";

    public static readonly string[] All = [AdminSEBN, ResponsableCantine, Prestataire];
}
