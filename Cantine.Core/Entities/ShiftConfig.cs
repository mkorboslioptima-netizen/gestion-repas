namespace Cantine.Core.Entities;

public class ShiftConfig
{
    public int Id { get; set; }
    public string Nom { get; set; } = "";
    public TimeOnly HeureDebut { get; set; }
    public TimeOnly HeureFin { get; set; }
    public bool Actif { get; set; } = true;
}
