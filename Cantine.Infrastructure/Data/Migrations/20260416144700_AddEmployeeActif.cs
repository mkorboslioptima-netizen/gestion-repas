using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeeActif : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "Actif",
                table: "Employees",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Actif",
                table: "Employees");
        }
    }
}
