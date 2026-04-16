using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class MealLogConfiguration : IEntityTypeConfiguration<MealLog>
{
    public void Configure(EntityTypeBuilder<MealLog> builder)
    {
        builder.HasKey(m => m.Id);

        builder.Property(m => m.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.Matricule)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(m => m.Timestamp)
            .IsRequired();

        builder.Property(m => m.RepasType)
            .IsRequired();

        // TicketNumber est rempli avec Id après l'insert (pas de colonne séparée)
        builder.Ignore(m => m.TicketNumber);

        builder.HasOne(m => m.Employee)
            .WithMany()
            .HasForeignKey(m => new { m.SiteId, m.Matricule })
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Lecteur)
            .WithMany()
            .HasForeignKey(m => m.LecteurId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
