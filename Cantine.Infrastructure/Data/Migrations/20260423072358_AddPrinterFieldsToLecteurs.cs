using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPrinterFieldsToLecteurs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NomImprimante",
                table: "Lecteurs",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PortImprimante",
                table: "Lecteurs",
                type: "int",
                nullable: false,
                defaultValue: 9100);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NomImprimante",
                table: "Lecteurs");

            migrationBuilder.DropColumn(
                name: "PortImprimante",
                table: "Lecteurs");
        }
    }
}
