namespace Cantine.Core.DTOs;

public class LecteurDto
{
    public int Id { get; set; }
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
}

public class CreateLecteurDto
{
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
}

public class UpdateLecteurDto
{
    public string Nom { get; set; } = string.Empty;
    public string AdresseIP { get; set; } = string.Empty;
    public bool Actif { get; set; }
}
