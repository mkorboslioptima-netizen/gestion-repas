namespace Cantine.Core.DTOs;

public class EmployeeDto
{
    public string Matricule { get; set; } = string.Empty;
    public string Nom { get; set; } = string.Empty;
    public string Prenom { get; set; } = string.Empty;
    public bool Actif { get; set; }
    public int MaxMealsPerDay { get; set; }
}
