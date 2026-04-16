namespace Cantine.Infrastructure.Printing;

public class PrintingOptions
{
    public const string SectionName = "Printing";

    /// <summary>"Pdf" en développement, "EscPos" en production.</summary>
    public string Mode { get; set; } = "EscPos";

    /// <summary>Dossier de sortie des tickets PDF (mode Pdf uniquement).</summary>
    public string PdfOutputPath { get; set; } = Path.Combine(Path.GetTempPath(), "CantineTickets");
}
