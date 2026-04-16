using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class EmployeeConfiguration : IEntityTypeConfiguration<Employee>
{
    public void Configure(EntityTypeBuilder<Employee> builder)
    {
        builder.HasKey(e => new { e.SiteId, e.Matricule });

        builder.Property(e => e.SiteId)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.Matricule)
            .HasMaxLength(20)
            .IsRequired();

        builder.Property(e => e.Nom)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.Prenom)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(e => e.MaxMealsPerDay)
            .HasDefaultValue(1);

        builder.Property(e => e.Actif)
            .HasDefaultValue(true)
            .IsRequired();

        builder.HasOne(e => e.Site)
            .WithMany()
            .HasForeignKey(e => e.SiteId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
