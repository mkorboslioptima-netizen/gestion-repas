using Cantine.Core.Entities;
using Cantine.Infrastructure.Data.Configurations;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Data;

public class CantineDbContext : DbContext
{
    public CantineDbContext(DbContextOptions<CantineDbContext> options) : base(options)
    {
    }

    public DbSet<Site> Sites => Set<Site>();
    public DbSet<MorphoConfig> MorphoConfigs => Set<MorphoConfig>();
    public DbSet<Lecteur> Lecteurs => Set<Lecteur>();
    public DbSet<Employee> Employees => Set<Employee>();
    public DbSet<MealLog> MealLogs => Set<MealLog>();
    public DbSet<SyncLog> SyncLogs => Set<SyncLog>();
    public DbSet<AppUser> AppUsers => Set<AppUser>();
    public DbSet<UserAuditLog> UserAuditLogs => Set<UserAuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfiguration(new SiteConfiguration());
        modelBuilder.ApplyConfiguration(new MorphoConfigConfiguration());
        modelBuilder.ApplyConfiguration(new LecteurConfiguration());
        modelBuilder.ApplyConfiguration(new EmployeeConfiguration());
        modelBuilder.ApplyConfiguration(new MealLogConfiguration());
        modelBuilder.ApplyConfiguration(new SyncLogConfiguration());
        modelBuilder.ApplyConfiguration(new AppUserConfiguration());
        modelBuilder.ApplyConfiguration(new UserAuditLogConfiguration());
    }
}
