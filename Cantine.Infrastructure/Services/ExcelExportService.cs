using Cantine.Core.Enums;
using Cantine.Infrastructure.Data;
using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Services;

public class ExcelExportService
{
    private readonly CantineDbContext _context;

    public ExcelExportService(CantineDbContext context)
    {
        _context = context;
    }

    public async Task<byte[]> GenererExportPassagesAsync(
        DateTime start, DateTime end,
        TimeSpan heureDebut, TimeSpan heureFin)
    {
        var logs = await _context.MealLogs
            .AsNoTracking()
            .Include(m => m.Employee)
            .Include(m => m.Lecteur)
            .Where(m => m.Timestamp >= start && m.Timestamp <= end)
            .OrderBy(m => m.Timestamp)
            .ToListAsync();

        var filtered = logs
            .Where(m => m.Timestamp.TimeOfDay >= heureDebut && m.Timestamp.TimeOfDay <= heureFin)
            .ToList();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Passages");

        // En-têtes
        string[] headers = ["Date", "Heure", "Nom", "Prénom", "Matricule", "Type de repas", "Lecteur"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
            cell.Style.Font.FontColor = XLColor.White;
        }

        int row = 2;
        foreach (var log in filtered)
        {
            ws.Cell(row, 1).Value = log.Timestamp.ToString("yyyy-MM-dd");
            ws.Cell(row, 2).Value = log.Timestamp.ToString("HH:mm");
            ws.Cell(row, 3).Value = log.Employee?.Nom ?? string.Empty;
            ws.Cell(row, 4).Value = log.Employee?.Prenom ?? string.Empty;
            ws.Cell(row, 5).Value = log.Matricule;
            ws.Cell(row, 6).Value = log.RepasType == RepasType.PlatChaud ? "Plat chaud" : "Sandwich";
            ws.Cell(row, 7).Value = log.Lecteur?.Nom ?? string.Empty;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
