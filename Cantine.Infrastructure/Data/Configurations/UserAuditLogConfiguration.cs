using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class UserAuditLogConfiguration : IEntityTypeConfiguration<UserAuditLog>
{
    public void Configure(EntityTypeBuilder<UserAuditLog> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.Action)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(l => l.Details)
            .HasMaxLength(500)
            .IsRequired(false);

        builder.Property(l => l.Timestamp)
            .IsRequired();

        builder.HasOne(l => l.Actor)
            .WithMany()
            .HasForeignKey(l => l.ActorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(l => l.TargetUser)
            .WithMany()
            .HasForeignKey(l => l.TargetUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
