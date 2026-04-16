using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class SiteConfiguration : IEntityTypeConfiguration<Site>
{
    public void Configure(EntityTypeBuilder<Site> builder)
    {
        builder.HasKey(s => s.SiteId);

        builder.Property(s => s.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.Nom)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(s => s.Actif)
            .HasDefaultValue(true);

        builder.HasData(
            new Site { SiteId = "SEBN-TN01", Nom = "SEBN Tunis 01", Actif = true },
            new Site { SiteId = "SEBN-TN02", Nom = "SEBN Tunis 02", Actif = true }
        );
    }
}
