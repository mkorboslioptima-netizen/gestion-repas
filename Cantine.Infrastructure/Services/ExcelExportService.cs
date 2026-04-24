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
        string[] headers = ["Site", "Repas servis", "Plats chauds", "Sandwichs"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(row, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
            cell.Style.Font.FontColor = XLColor.White;
        }
        row++;
        int totalPassages = 0, totalPlat = 0, totalSandwich = 0;

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

            int platChaud = filtered.Count(l => l.RepasType == RepasType.PlatChaud);
            int sandwich  = filtered.Count(l => l.RepasType == RepasType.Sandwich);

            ws.Cell(row, 1).Value = site.Nom;
            ws.Cell(row, 2).Value = filtered.Count;
            ws.Cell(row, 3).Value = platChaud;
            ws.Cell(row, 4).Value = sandwich;

            totalPassages += filtered.Count;
            totalPlat     += platChaud;
            totalSandwich += sandwich;
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

    public async Task<byte[]> GenererExportEmployesAsync(
        string siteId,
        string? search = null,
        bool? actif = null,
        int? maxMealsPerDay = null)
    {
        var site = await _context.Sites.AsNoTracking()
            .FirstOrDefaultAsync(s => s.SiteId == siteId);

        var query = _context.Employees
            .AsNoTracking()
            .Where(e => e.SiteId == siteId);

        if (actif.HasValue)
            query = query.Where(e => e.Actif == actif.Value);

        if (maxMealsPerDay.HasValue)
            query = query.Where(e => e.MaxMealsPerDay == maxMealsPerDay.Value);

        var employes = await query.OrderBy(e => e.Nom).ThenBy(e => e.Prenom).ToListAsync();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var q = search.ToLowerInvariant();
            employes = employes
                .Where(e => e.Matricule.ToLowerInvariant().Contains(q)
                         || e.Nom.ToLowerInvariant().Contains(q)
                         || e.Prenom.ToLowerInvariant().Contains(q))
                .ToList();
        }

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Employés");

        // Bloc filtres appliqués (si au moins un filtre actif)
        bool aFiltres = !string.IsNullOrWhiteSpace(search) || actif.HasValue || maxMealsPerDay.HasValue;
        int headerRow = 4;

        ws.Cell(1, 1).Value = $"Liste des employés — {site?.Nom ?? siteId}";
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontSize = 13;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromArgb(37, 99, 235);
        ws.Cell(2, 1).Value = $"Généré le {DateTime.Now:dd/MM/yyyy à HH:mm}";
        ws.Cell(2, 1).Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);

        if (aFiltres)
        {
            ws.Cell(3, 1).Value = "Filtres : "
                + (actif.HasValue ? (actif.Value ? "Actifs" : "Inactifs") : "Tous statuts")
                + " · " + (maxMealsPerDay.HasValue ? $"{maxMealsPerDay.Value} repas/j" : "Tous quotas")
                + (string.IsNullOrWhiteSpace(search) ? "" : $" · Recherche : \"{search}\"");
            ws.Cell(3, 1).Style.Font.Italic = true;
            ws.Cell(3, 1).Style.Font.FontColor = XLColor.FromArgb(71, 85, 105);
            headerRow = 5;
        }

        string[] headers = ["Matricule", "Nom", "Prénom", "Statut", "Quota (repas/j)"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(headerRow, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
            cell.Style.Font.FontColor = XLColor.White;
        }

        int row = headerRow + 1;
        foreach (var e in employes)
        {
            ws.Cell(row, 1).Value = e.Matricule;
            ws.Cell(row, 2).Value = e.Nom;
            ws.Cell(row, 3).Value = e.Prenom;
            ws.Cell(row, 4).Value = e.Actif ? "Actif" : "Inactif";
            ws.Cell(row, 5).Value = e.MaxMealsPerDay;
            if (!e.Actif)
                ws.Row(row).Style.Font.FontColor = XLColor.FromArgb(148, 163, 184);
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<byte[]> GenererExportHistoriqueAsync(
        DateTime dateDebut, DateTime dateFin,
        TimeSpan? heureDebut, TimeSpan? heureFin,
        string? siteId, string? matricule, string? repasType)
    {
        var query = _context.MealLogs
            .AsNoTracking()
            .Include(m => m.Employee)
            .Include(m => m.Lecteur)
            .Where(m => m.Timestamp >= dateDebut && m.Timestamp < dateFin.AddDays(1));

        if (!string.IsNullOrWhiteSpace(siteId))
            query = query.Where(m => m.SiteId == siteId);
        if (!string.IsNullOrWhiteSpace(matricule))
            query = query.Where(m => m.Matricule.Contains(matricule));
        if (!string.IsNullOrWhiteSpace(repasType) && Enum.TryParse<RepasType>(repasType, out var rt))
            query = query.Where(m => m.RepasType == rt);
        if (heureDebut.HasValue)
            query = query.Where(m => m.Timestamp.TimeOfDay >= heureDebut.Value);
        if (heureFin.HasValue)
            query = query.Where(m => m.Timestamp.TimeOfDay <= heureFin.Value);

        var logs = await query.OrderBy(m => m.Timestamp).ToListAsync();

        var sites = await _context.Sites.AsNoTracking().ToDictionaryAsync(s => s.SiteId, s => s.Nom);

        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add("Historique des pointages");

        string[] headers = ["Matricule", "Nom", "Prénom", "Site", "Lecteur", "Type repas", "Date", "Heure"];
        for (int i = 0; i < headers.Length; i++)
        {
            var cell = ws.Cell(1, i + 1);
            cell.Value = headers[i];
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromArgb(37, 99, 235);
            cell.Style.Font.FontColor = XLColor.White;
        }

        int row = 2;
        foreach (var m in logs)
        {
            ws.Cell(row, 1).Value = m.Matricule;
            ws.Cell(row, 2).Value = m.Employee?.Nom ?? "";
            ws.Cell(row, 3).Value = m.Employee?.Prenom ?? "";
            ws.Cell(row, 4).Value = sites.TryGetValue(m.SiteId, out var sn) ? sn : m.SiteId;
            ws.Cell(row, 5).Value = m.Lecteur?.Nom ?? "";
            ws.Cell(row, 6).Value = m.RepasType == RepasType.PlatChaud ? "Plat chaud" : "Sandwich";
            ws.Cell(row, 7).Value = m.Timestamp.ToString("dd/MM/yyyy");
            ws.Cell(row, 8).Value = m.Timestamp.ToString("HH:mm");
            row++;
        }

        ws.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}
