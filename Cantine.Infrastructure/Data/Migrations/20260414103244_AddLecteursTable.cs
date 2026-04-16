using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddLecteursTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Lecteurs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    AdresseIP = table.Column<string>(type: "nvarchar(45)", maxLength: 45, nullable: false),
                    Actif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Lecteurs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Lecteurs_AdresseIP",
                table: "Lecteurs",
                column: "AdresseIP",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Lecteurs");
        }
    }
}
