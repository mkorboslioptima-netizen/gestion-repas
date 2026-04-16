using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEmployeesAndMealLogs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PrinterIP",
                table: "Lecteurs",
                type: "nvarchar(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Employees",
                columns: table => new
                {
                    Matricule = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Prenom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaxMealsPerDay = table.Column<int>(type: "int", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Employees", x => x.Matricule);
                });

            migrationBuilder.CreateTable(
                name: "MealLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Matricule = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    LecteurId = table.Column<int>(type: "int", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RepasType = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MealLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MealLogs_Employees_Matricule",
                        column: x => x.Matricule,
                        principalTable: "Employees",
                        principalColumn: "Matricule",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MealLogs_Lecteurs_LecteurId",
                        column: x => x.LecteurId,
                        principalTable: "Lecteurs",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_LecteurId",
                table: "MealLogs",
                column: "LecteurId");

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_Matricule",
                table: "MealLogs",
                column: "Matricule");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MealLogs");

            migrationBuilder.DropTable(
                name: "Employees");

            migrationBuilder.DropColumn(
                name: "PrinterIP",
                table: "Lecteurs");
        }
    }
}
