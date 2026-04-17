using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class SyncLogConfiguration : IEntityTypeConfiguration<SyncLog>
{
    public void Configure(EntityTypeBuilder<SyncLog> builder)
    {
        builder.HasKey(s => s.Id);

        builder.Property(s => s.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(s => s.Source)
            .HasMaxLength(10)
            .IsRequired();

        builder.Property(s => s.OccurredAt)
            .IsRequired();

        builder.HasOne(s => s.Site)
            .WithMany()
            .HasForeignKey(s => s.SiteId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
