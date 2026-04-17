using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Data;

/// <summary>
/// Seed des données initiales (comptes par défaut).
/// Appelé au démarrage de l'API si la table AppUsers est vide.
/// </summary>
public static class DbInitializer
{
    public static async Task SeedAsync(CantineDbContext context, ILogger logger)
    {
        if (await context.AppUsers.AnyAsync()) return;

        logger.LogInformation("[Seed] Création des comptes par défaut...");

        context.AppUsers.AddRange(
            new AppUser
            {
                Email = "admin@sebn.tn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Nom = "Admin SEBN",
                Role = "AdminSEBN",
                SiteId = null
            },
            new AppUser
            {
                Email = "responsable@sebn.tn",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Nom = "Responsable Cantine",
                Role = "ResponsableCantine",
                SiteId = "SEBN-TN01"
            }
        );

        await context.SaveChangesAsync();
        logger.LogInformation("[Seed] Comptes créés : admin@sebn.tn, responsable@sebn.tn (mot de passe : Admin123!)");
    }
}
