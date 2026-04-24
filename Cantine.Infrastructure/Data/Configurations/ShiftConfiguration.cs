using Cantine.Core.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Cantine.Infrastructure.Data.Configurations;

public class ShiftConfiguration : IEntityTypeConfiguration<ShiftConfig>
{
    public void Configure(EntityTypeBuilder<ShiftConfig> builder)
    {
        builder.ToTable("ShiftConfigs");
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Nom).IsRequired().HasMaxLength(50);
        builder.HasData(
            new ShiftConfig { Id = 1, Nom = "Matin",          HeureDebut = new TimeOnly(8,  0), HeureFin = new TimeOnly(12, 0), Actif = true  },
            new ShiftConfig { Id = 2, Nom = "Administration",  HeureDebut = new TimeOnly(12, 0), HeureFin = new TimeOnly(14, 0), Actif = true  },
            new ShiftConfig { Id = 3, Nom = "Après-midi",      HeureDebut = new TimeOnly(16, 0), HeureFin = new TimeOnly(21, 0), Actif = true  },
            new ShiftConfig { Id = 4, Nom = "Nuit",            HeureDebut = new TimeOnly(0,  0), HeureFin = new TimeOnly(4,  0), Actif = false }
        );
    }
}
