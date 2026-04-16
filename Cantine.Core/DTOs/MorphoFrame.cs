using Cantine.Core.Enums;

namespace Cantine.Core.DTOs;

public class MorphoFrame
{
    public string Matricule { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public RepasType RepasType { get; set; }
    public string SerialNumber { get; set; } = string.Empty;
}
