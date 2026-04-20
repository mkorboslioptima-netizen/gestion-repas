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

    public async Task<byte[]> GenererExportGlobalAsync(
        DateTime start, DateTime end,
        TimeSpan heureDebut, TimeSpan heureFin,
        string? siteId = null,
        string? repasType = null,
        string? siteNom = null)
    {
        var sites = await _context.Sites
            .AsNoTracking()
            .Where(s => s.Actif && (siteId == null || s.SiteId == siteId))
            .OrderBy(s => s.Nom)
            .ToListAsync();

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Résumé par site");

        // ── Bloc filtres appliqués ────────────────────────────────────────────
        void LigneFiltre(int r, string label, string valeur)
        {
            ws.Cell(r, 1).Value = label;
            ws.Cell(r, 1).Style.Font.Bold = true;
            ws.Cell(r, 1).Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);
            ws.Cell(r, 2).Value = valeur;
        }

        ws.Cell(1, 1).Value = "Filtres appliqués";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 12;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromArgb(37, 99, 235);

        LigneFiltre(2, "Période",      $"{start:dd/MM/yyyy} → {end:dd/MM/yyyy}");
        LigneFiltre(3, "Heures",       $"{heureDebut:hh\\:mm} → {heureFin:hh\\:mm}");
        LigneFiltre(4, "Site",         siteNom ?? "Tous les sites");
        LigneFiltre(5, "Type de repas",
            repasType == "PlatChaud" ? "Plat chaud" :
            repasType == "Sandwich"  ? "Sandwich"   : "Tous");
        LigneFiltre(6, "Généré le",    DateTime.Now.ToString("dd/MM/yyyy à HH:mm"));

        // Ligne vide séparatrice
        int row = 8;

        // ── En-têtes tableau ─────────────────────────────────────────────────
        string[] headers = ["Site", "Repas servis", "Plats chauds", "Sandwichs", "Quota atteint"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(row, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
            cell.Style.Font.FontColor = XLColor.White;
        }
        row++;
        int totalPassages = 0, totalPlat = 0, totalSandwich = 0, totalQuota = 0;

        foreach (var site in sites)
        {
            var logs = await _context.MealLogs
                .AsNoTracking()
                .Where(m => m.SiteId == site.SiteId && m.Timestamp >= start && m.Timestamp <= end)
                .ToListAsync();

            var filtered = logs
                .Where(m => m.Timestamp.TimeOfDay >= heureDebut && m.Timestamp.TimeOfDay <= heureFin)
                .Where(m => repasType == null || m.RepasType.ToString() == repasType)
                .ToList();

            var matricules = filtered.Select(l => l.Matricule).Distinct();
            int quota = 0;
            foreach (var matricule in matricules)
            {
                var employee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.SiteId == site.SiteId && e.Matricule == matricule);
                if (employee is not null && filtered.Count(l => l.Matricule == matricule) >= employee.MaxMealsPerDay)
                    quota++;
            }

            int platChaud = filtered.Count(l => l.RepasType == RepasType.PlatChaud);
            int sandwich  = filtered.Count(l => l.RepasType == RepasType.Sandwich);

            ws.Cell(row, 1).Value = site.Nom;
            ws.Cell(row, 2).Value = filtered.Count;
            ws.Cell(row, 3).Value = platChaud;
            ws.Cell(row, 4).Value = sandwich;
            ws.Cell(row, 5).Value = quota;

            totalPassages += filtered.Count;
            totalPlat     += platChaud;
            totalSandwich += sandwich;
            totalQuota    += quota;
            row++;
        }

        // Ligne totaux
        var totalRow = ws.Row(row);
        totalRow.Style.Font.Bold = true;
        totalRow.Style.Fill.BackgroundColor = XLColor.FromArgb(239, 246, 255);
        ws.Cell(row, 1).Value = "TOTAL";
        ws.Cell(row, 2).Value = totalPassages;
        ws.Cell(row, 3).Value = totalPlat;
        ws.Cell(row, 4).Value = totalSandwich;
        ws.Cell(row, 5).Value = totalQuota;

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> GenererExportPassagesAsync(
        DateTime start, DateTime end,
        TimeSpan heureDebut, TimeSpan heureFin,
        string? siteId = null,
        string? repasType = null)
    {
        var query = _context.MealLogs
            .AsNoTracking()
            .Include(m => m.Employee)
            .Include(m => m.Lecteur)
            .Where(m => m.Timestamp >= start && m.Timestamp <= end);

        if (siteId is not null)
            query = query.Where(m => m.SiteId == siteId);

        var logs = await query.OrderBy(m => m.Timestamp).ToListAsync();

        var filtered = logs
            .Where(m => m.Timestamp.TimeOfDay >= heureDebut && m.Timestamp.TimeOfDay <= heureFin)
            .Where(m => repasType == null || m.RepasType.ToString() == repasType)
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
