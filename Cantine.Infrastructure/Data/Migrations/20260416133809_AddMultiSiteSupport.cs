using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiSiteSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MealLogs_Employees_Matricule",
                table: "MealLogs");

            migrationBuilder.DropIndex(
                name: "IX_MealLogs_Matricule",
                table: "MealLogs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Employees",
                table: "Employees");

            migrationBuilder.AddColumn<string>(
                name: "SiteId",
                table: "MealLogs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteId",
                table: "Lecteurs",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "SiteId",
                table: "Employees",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Employees",
                table: "Employees",
                columns: new[] { "SiteId", "Matricule" });

            migrationBuilder.CreateTable(
                name: "Sites",
                columns: table => new
                {
                    SiteId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Actif = table.Column<bool>(type: "bit", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sites", x => x.SiteId);
                });

            migrationBuilder.CreateTable(
                name: "MorphoConfigs",
                columns: table => new
                {
                    SiteId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    ConnectionString = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Query = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    CommandTimeout = table.Column<int>(type: "int", nullable: false, defaultValue: 30)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MorphoConfigs", x => x.SiteId);
                    table.ForeignKey(
                        name: "FK_MorphoConfigs_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "SiteId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Sites",
                columns: new[] { "SiteId", "Actif", "Nom" },
                values: new object[,]
                {
                    { "SEBN-TN01", true, "SEBN Tunis 01" },
                    { "SEBN-TN02", true, "SEBN Tunis 02" }
                });

            // Migrer les lignes existantes vers SEBN-TN01 (site par défaut Phase 1)
            migrationBuilder.Sql("UPDATE [Employees] SET [SiteId] = 'SEBN-TN01' WHERE [SiteId] = ''");
            migrationBuilder.Sql("UPDATE [Lecteurs] SET [SiteId] = 'SEBN-TN01' WHERE [SiteId] = ''");
            migrationBuilder.Sql("UPDATE [MealLogs] SET [SiteId] = 'SEBN-TN01' WHERE [SiteId] = ''");

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_SiteId_Matricule",
                table: "MealLogs",
                columns: new[] { "SiteId", "Matricule" });

            migrationBuilder.CreateIndex(
                name: "IX_Lecteurs_SiteId",
                table: "Lecteurs",
                column: "SiteId");

            migrationBuilder.AddForeignKey(
                name: "FK_Employees_Sites_SiteId",
                table: "Employees",
                column: "SiteId",
                principalTable: "Sites",
                principalColumn: "SiteId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Lecteurs_Sites_SiteId",
                table: "Lecteurs",
                column: "SiteId",
                principalTable: "Sites",
                principalColumn: "SiteId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_MealLogs_Employees_SiteId_Matricule",
                table: "MealLogs",
                columns: new[] { "SiteId", "Matricule" },
                principalTable: "Employees",
                principalColumns: new[] { "SiteId", "Matricule" },
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Employees_Sites_SiteId",
                table: "Employees");

            migrationBuilder.DropForeignKey(
                name: "FK_Lecteurs_Sites_SiteId",
                table: "Lecteurs");

            migrationBuilder.DropForeignKey(
                name: "FK_MealLogs_Employees_SiteId_Matricule",
                table: "MealLogs");

            migrationBuilder.DropTable(
                name: "MorphoConfigs");

            migrationBuilder.DropTable(
                name: "Sites");

            migrationBuilder.DropIndex(
                name: "IX_MealLogs_SiteId_Matricule",
                table: "MealLogs");

            migrationBuilder.DropIndex(
                name: "IX_Lecteurs_SiteId",
                table: "Lecteurs");

            migrationBuilder.DropPrimaryKey(
                name: "PK_Employees",
                table: "Employees");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "MealLogs");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "Lecteurs");

            migrationBuilder.DropColumn(
                name: "SiteId",
                table: "Employees");

            migrationBuilder.AddPrimaryKey(
                name: "PK_Employees",
                table: "Employees",
                column: "Matricule");

            migrationBuilder.CreateIndex(
                name: "IX_MealLogs_Matricule",
                table: "MealLogs",
                column: "Matricule");

            migrationBuilder.AddForeignKey(
                name: "FK_MealLogs_Employees_Matricule",
                table: "MealLogs",
                column: "Matricule",
                principalTable: "Employees",
                principalColumn: "Matricule",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
