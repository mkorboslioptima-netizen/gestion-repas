using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShiftConfigs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ShiftConfigs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    HeureDebut = table.Column<TimeOnly>(type: "time", nullable: false),
                    HeureFin = table.Column<TimeOnly>(type: "time", nullable: false),
                    Actif = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShiftConfigs", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "ShiftConfigs",
                columns: new[] { "Id", "Actif", "HeureDebut", "HeureFin", "Nom" },
                values: new object[,]
                {
                    { 1, true,  new TimeOnly(8,  0), new TimeOnly(12, 0), "Matin"          },
                    { 2, true,  new TimeOnly(12, 0), new TimeOnly(14, 0), "Administration" },
                    { 3, true,  new TimeOnly(16, 0), new TimeOnly(21, 0), "Après-midi"     },
                    { 4, false, new TimeOnly(0,  0), new TimeOnly(4,  0), "Nuit"           }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "ShiftConfigs");
        }
    }
}
