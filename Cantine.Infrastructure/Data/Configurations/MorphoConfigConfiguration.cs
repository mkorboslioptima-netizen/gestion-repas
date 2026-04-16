using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class MorphoConfigConfiguration : IEntityTypeConfiguration<MorphoConfig>
{
    public void Configure(EntityTypeBuilder<MorphoConfig> builder)
    {
        builder.HasKey(m => m.SiteId);

        builder.Property(m => m.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.ConnectionString)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(m => m.Query)
            .HasMaxLength(1000)
            .IsRequired();

        builder.Property(m => m.CommandTimeout)
            .HasDefaultValue(30);

        builder.HasOne(m => m.Site)
            .WithMany()
            .HasForeignKey(m => m.SiteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
