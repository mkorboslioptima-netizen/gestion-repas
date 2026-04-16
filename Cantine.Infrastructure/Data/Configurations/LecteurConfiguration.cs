using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class LecteurConfiguration : IEntityTypeConfiguration<Lecteur>
{
    public void Configure(EntityTypeBuilder<Lecteur> builder)
    {
        builder.HasKey(l => l.Id);

        builder.Property(l => l.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(l => l.Nom)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(l => l.AdresseIP)
            .IsRequired()
            .HasMaxLength(45);

        builder.HasIndex(l => l.AdresseIP)
            .IsUnique();

        builder.Property(l => l.Actif)
            .HasDefaultValue(true);

        builder.Property(l => l.PrinterIP)
            .HasMaxLength(45)
            .IsRequired(false);

        builder.HasOne(l => l.Site)
            .WithMany()
            .HasForeignKey(l => l.SiteId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
