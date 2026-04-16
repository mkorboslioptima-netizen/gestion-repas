namespace Cantine.Core.Entities;

public class Employee
{
    public string SiteId { get; set; } = string.Empty;
    public string Matricule { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public int MaxMealsPerDay { get; set; } = 1;
    public bool Actif { get; set; } = true;

    public Site? Site { get; set; }
}
