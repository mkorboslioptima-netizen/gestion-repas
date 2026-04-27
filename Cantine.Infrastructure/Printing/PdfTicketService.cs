using Cantine.Core.Entities;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace Cantine.Infrastructure.Printing;

public class PdfTicketService : IEscPosService
{
    // Largeur ticket 80 mm en points (1 mm ≈ 2.8346 pt)
    private const float TicketWidthPt = 80 * 2.8346f;
    private const float TicketHeightPt = 160 * 2.8346f;

    private readonly PrintingOptions _options;
    private readonly ILogger<PdfTicketService> _logger;

    public PdfTicketService(IOptions<PrintingOptions> options, ILogger<PdfTicketService> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public Task PrintTicketAsync(MealLog mealLog, Employee employee, Lecteur lecteur, int mealNumberToday)
    {
        try
        {
            Directory.CreateDirectory(_options.PdfOutputPath);
            var filePath = Path.Combine(_options.PdfOutputPath, $"ticket_{mealLog.TicketNumber:D5}.pdf");

            var document = Document.Create(container =>
            {
                container.Page(page =>
                {
                    page.Size(TicketWidthPt, TicketHeightPt);
                    page.Margin(5, Unit.Millimetre);
                    page.DefaultTextStyle(x => x.FontFamily(Fonts.CourierNew).FontSize(8));

                    page.Content().Column(col =>
                    {
                        // En-tête
                        col.Item()
                            .AlignCenter()
                            .Text("CANTINE SEBN")
                            .Bold()
                            .FontSize(13);

                        col.Item().PaddingVertical(3).LineHorizontal(0.5f);

                        // Informations employé
                        col.Item().Text($"Matricule : {employee.Matricule}");
                        col.Item().Text($"Nom       : {employee.Nom} {employee.Prenom}");
                        col.Item().Text($"Date      : {mealLog.Timestamp:dd/MM/yyyy}");
                        col.Item().Text($"Heure     : {mealLog.Timestamp:HH:mm:ss}");
                        col.Item().Text($"Zone      : {lecteur.Nom}");

                        col.Item().PaddingVertical(3).LineHorizontal(0.5f);

                        // Type de repas
                        var typeRepas = mealLog.RepasType == RepasType.PlatChaud
                            ? "PLAT CHAUD"
                            : "SANDWICH FROID";

                        col.Item()
                            .AlignCenter()
                            .Text(typeRepas)
                            .Bold()
                            .FontSize(11);

                        col.Item()
                            .PaddingTop(4)
                            .AlignCenter()
                            .Text($"Ticket N° {mealLog.TicketNumber:D5}")
                            .FontSize(8);

                        col.Item().PaddingVertical(3).LineHorizontal(0.5f);
                    });
                });
            });

            document.GeneratePdf(filePath);

            _logger.LogInformation("[PDF] Ticket #{TicketNumber} généré : {FilePath}",
                mealLog.TicketNumber, filePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[PDF] Échec génération ticket #{TicketNumber}", mealLog.TicketNumber);
        }

        return Task.CompletedTask;
    }
}
