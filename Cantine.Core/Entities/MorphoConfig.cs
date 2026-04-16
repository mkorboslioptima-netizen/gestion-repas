namespace Cantine.Core.Entities;

public class MorphoConfig
{
    public string SiteId { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string Query { get; set; } = "SELECT BadgeNumber AS Matricule, LastName AS Nom, FirstName AS Prenom FROM Users WHERE Active = 1";
    public int CommandTimeout { get; set; } = 30;

    public Site? Site { get; set; }
}
