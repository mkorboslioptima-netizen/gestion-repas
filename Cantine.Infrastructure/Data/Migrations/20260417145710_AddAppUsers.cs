using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Cantine.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAppUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AppUsers",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Nom = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SiteId = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AppUsers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AppUsers_Sites_SiteId",
                        column: x => x.SiteId,
                        principalTable: "Sites",
                        principalColumn: "SiteId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_Email",
                table: "AppUsers",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppUsers_SiteId",
                table: "AppUsers",
                column: "SiteId");

            // Seed : 2 comptes par défaut (mot de passe : Admin123!)
            migrationBuilder.InsertData(
                table: "AppUsers",
                columns: new[] { "Email", "PasswordHash", "Nom", "Role", "SiteId" },
                values: new object[,]
                {
                    {
                        "admin@sebn.tn",
                        "$2a$11$yOpkOPGJ5QcAZy3rvwu9Ouk05mQaTG7bNYfH2lCke1ROU8vfs9uAW",
                        "Admin SEBN",
                        "AdminSEBN",
                        null
                    },
                    {
                        "responsable@sebn.tn",
                        "$2a$11$/0KJgOewsarKPzfVjqCQXejEi5EbMm5R6a8sNGodAyfliFIRKBuvy",
                        "Responsable Cantine",
                        "ResponsableCantine",
                        "SEBN-TN01"
                    }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AppUsers");
        }
    }
}
