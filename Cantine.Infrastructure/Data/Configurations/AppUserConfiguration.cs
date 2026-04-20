using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class AppUserConfiguration : IEntityTypeConfiguration<AppUser>
{
    public void Configure(EntityTypeBuilder<AppUser> builder)
    {
        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .HasMaxLength(200)
            .IsRequired();

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .IsRequired();

        builder.Property(u => u.Nom)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(u => u.Role)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(u => u.SiteId)
            .HasMaxLength(20)
            .IsRequired(false);

        builder.Property(u => u.IsActive)
            .HasDefaultValue(true)
            .IsRequired();

        builder.Property(u => u.CreatedAt)
            .IsRequired();

        builder.Property(u => u.CreatedBy)
            .HasMaxLength(200)
            .IsRequired(false);

        builder.HasOne(u => u.Site)
            .WithMany()
            .HasForeignKey(u => u.SiteId)
            .OnDelete(DeleteBehavior.Restrict)
            .IsRequired(false);
    }
}
