using System.Globalization;
using System.Security.Claims;
using System.Text.Json;
using Cantine.Core.DTOs;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Cantine.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/repas")]
[Authorize]
public class RepasController : ControllerBase
{
    private readonly IMealLogRepository _mealLogRepo;
    private readonly CantineDbContext _context;
    private readonly ExcelExportService _excelService;

    public RepasController(IMealLogRepository mealLogRepo, CantineDbContext context, ExcelExportService excelService)
    {
        _mealLogRepo = mealLogRepo;
        _context = context;
        _excelService = excelService;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string? GetUserSiteId() => User.FindFirst("siteId")?.Value;
    private bool IsAdmin() => User.IsInRole("AdminSEBN");

    private static bool TryParseFiltreParams(
        string? dateDebutStr, string? dateFinStr,
        string? heureDebutStr, string? heureFinStr,
        out DateTime start, out DateTime end,
        out TimeSpan heureDebut, out TimeSpan heureFin,
        out string? error)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        DateOnly dateDebut = today;
        DateOnly dateFin = today;
        heureDebut = TimeSpan.Zero;
        heureFin = new TimeSpan(23, 59, 59);
        start = default;
        end = default;
        error = null;

        if (dateDebutStr is not null && !DateOnly.TryParseExact(dateDebutStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out dateDebut))
        { error = $"Format dateDebut invalide : '{dateDebutStr}'. Attendu : yyyy-MM-dd"; return false; }

        if (dateFinStr is not null && !DateOnly.TryParseExact(dateFinStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out dateFin))
        { error = $"Format dateFin invalide : '{dateFinStr}'. Attendu : yyyy-MM-dd"; return false; }

        if (dateDebut > dateFin)
        { error = "dateDebut ne peut pas être supérieure à dateFin."; return false; }

        if (heureDebutStr is not null)
        {
            if (!TimeSpan.TryParseExact(heureDebutStr, @"hh\:mm", CultureInfo.InvariantCulture, out heureDebut))
            { error = $"Format heureDebut invalide : '{heureDebutStr}'. Attendu : HH:mm"; return false; }
        }

        if (heureFinStr is not null)
        {
            if (!TimeSpan.TryParseExact(heureFinStr, @"hh\:mm", CultureInfo.InvariantCulture, out heureFin))
            { error = $"Format heureFin invalide : '{heureFinStr}'. Attendu : HH:mm"; return false; }
            else
                heureFin = heureFin.Add(TimeSpan.FromSeconds(59));
        }

        start = dateDebut.ToDateTime(TimeOnly.MinValue);
        end = dateFin.ToDateTime(TimeOnly.MaxValue);
        return true;
    }

    // ── GET /api/repas/historique-jour ────────────────────────────────────────
    [HttpGet("historique-jour")]
    public async Task<IActionResult> GetHistoriqueJour(
        [FromQuery] int limit = 50,
        [FromQuery] string? dateDebut = null,
        [FromQuery] string? dateFin = null,
        [FromQuery] string? heureDebut = null,
        [FromQuery] string? heureFin = null,
        [FromQuery] string? siteId = null,
        [FromQuery] string? repasType = null)
    {
        if (!IsAdmin()) siteId = GetUserSiteId();

        // Mode filtré : requête directe sur DbContext
        if (dateDebut is not null || dateFin is not null || heureDebut is not null || heureFin is not null || siteId is not null || repasType is not null)
        {
            if (!TryParseFiltreParams(dateDebut, dateFin, heureDebut, heureFin,
                    out var start, out var end, out var tDebut, out var tFin, out var error))
                return BadRequest(new { message = error });

            var query = _context.MealLogs
                .AsNoTracking()
                .Include(m => m.Employee)
                .Include(m => m.Lecteur)
                .Where(m => m.Timestamp >= start && m.Timestamp <= end);

            if (siteId is not null)
                query = query.Where(m => m.SiteId == siteId);

            var logs = await query.OrderByDescending(m => m.Timestamp).ToListAsync();

            var filtered = logs
                .Where(m => m.Timestamp.TimeOfDay >= tDebut && m.Timestamp.TimeOfDay <= tFin)
                .Where(m => repasType == null || m.RepasType.ToString() == repasType)
                .Take(Math.Min(limit > 50 ? limit : 500, 5000))
                .Select(m => new PassageDto
                {
                    Id = m.Id,
                    Matricule = m.Matricule,
                    Nom = m.Employee?.Nom ?? string.Empty,
                    Prenom = m.Employee?.Prenom ?? string.Empty,
                    Timestamp = m.Timestamp,
                    RepasType = m.RepasType,
                    LecteurNom = m.Lecteur?.Nom ?? string.Empty,
                    SiteId = m.SiteId,
                })
                .ToList();

            return Ok(filtered);
        }

        // Mode défaut : aujourd'hui
        var today = DateOnly.FromDateTime(DateTime.Now);
        var historique = await _mealLogRepo.GetHistoriqueJourAsync(today, Math.Clamp(limit, 1, 200));
        return Ok(historique);
    }

    // ── GET /api/repas/stats-jour ─────────────────────────────────────────────
    [HttpGet("stats-jour")]
    public async Task<IActionResult> GetStatsJour(
        [FromQuery] string? dateDebut = null,
        [FromQuery] string? dateFin = null,
        [FromQuery] string? heureDebut = null,
        [FromQuery] string? heureFin = null,
        [FromQuery] string? siteId = null)
    {
        if (!TryParseFiltreParams(dateDebut, dateFin, heureDebut, heureFin,
                out var start, out var end, out var tDebut, out var tFin, out var error))
            return BadRequest(new { message = error });

        if (!IsAdmin()) siteId = GetUserSiteId();

        var sitesQuery = _context.Sites.AsNoTracking().Where(s => s.Actif);
        if (siteId is not null)
            sitesQuery = sitesQuery.Where(s => s.SiteId == siteId);
        var sites = await sitesQuery.ToListAsync();

        var stats = new List<RepasStatsDto>();

        foreach (var site in sites)
        {
            var logs = await _context.MealLogs
                .AsNoTracking()
                .Where(m => m.SiteId == site.SiteId && m.Timestamp >= start && m.Timestamp <= end)
                .ToListAsync();

            var logsFiltered = logs
                .Where(m => m.Timestamp.TimeOfDay >= tDebut && m.Timestamp.TimeOfDay <= tFin)
                .ToList();

            var matricules = logsFiltered.Select(l => l.Matricule).Distinct();
            int quotaAtteint = 0;
            foreach (var matricule in matricules)
            {
                var employee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.SiteId == site.SiteId && e.Matricule == matricule);
                if (employee is not null && logsFiltered.Count(l => l.Matricule == matricule) >= employee.MaxMealsPerDay)
                    quotaAtteint++;
            }

            stats.Add(new RepasStatsDto
            {
                SiteId = site.SiteId,
                NomSite = site.Nom,
                TotalPassages = logsFiltered.Count,
                PlatChaud = logsFiltered.Count(l => l.RepasType == RepasType.PlatChaud),
                Sandwich = logsFiltered.Count(l => l.RepasType == RepasType.Sandwich),
                QuotaAtteint = quotaAtteint
            });
        }

        return Ok(stats);
    }

    // ── GET /api/repas/export ─────────────────────────────────────────────────
    [HttpGet("export")]
    [Authorize(Roles = "AdminSEBN,ResponsableCantine,Prestataire")]
    public async Task<IActionResult> GetExport(
        [FromQuery] string? dateDebut = null,
        [FromQuery] string? dateFin = null,
        [FromQuery] string? heureDebut = null,
        [FromQuery] string? heureFin = null,
        [FromQuery] string? siteId = null,
        [FromQuery] string? repasType = null)
    {
        if (!TryParseFiltreParams(dateDebut, dateFin, heureDebut, heureFin,
                out var start, out var end, out var tDebut, out var tFin, out var error))
            return BadRequest(new { message = error });

        if (!IsAdmin()) siteId = GetUserSiteId();

        var bytes = await _excelService.GenererExportPassagesAsync(start, end, tDebut, tFin, siteId, repasType);

        var dDebut = dateDebut ?? DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        var dFin = dateFin ?? dDebut;
        var fileName = $"passages-{dDebut}-{dFin}.xlsx";

        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // ── GET /api/repas/export-global ─────────────────────────────────────────
    [HttpGet("export-global")]
    [Authorize(Roles = "AdminSEBN,ResponsableCantine,Prestataire")]
    public async Task<IActionResult> GetExportGlobal(
        [FromQuery] string? dateDebut = null,
        [FromQuery] string? dateFin = null,
        [FromQuery] string? heureDebut = null,
        [FromQuery] string? heureFin = null,
        [FromQuery] string? siteId = null,
        [FromQuery] string? repasType = null)
    {
        if (!TryParseFiltreParams(dateDebut, dateFin, heureDebut, heureFin,
                out var start, out var end, out var tDebut, out var tFin, out var error))
            return BadRequest(new { message = error });

        if (!IsAdmin()) siteId = GetUserSiteId();

        string? siteNom = null;
        if (siteId is not null)
            siteNom = (await _context.Sites.AsNoTracking().FirstOrDefaultAsync(s => s.SiteId == siteId))?.Nom;

        var bytes = await _excelService.GenererExportGlobalAsync(start, end, tDebut, tFin, siteId, repasType, siteNom);

        var dDebut = dateDebut ?? DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        var dFin = dateFin ?? dDebut;
        var fileName = $"resume-repas-{dDebut}-{dFin}.xlsx";

        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", fileName);
    }

    // ── GET /api/repas/flux — SSE ─────────────────────────────────────────────
    [HttpGet("flux")]
    public async Task GetFlux(CancellationToken ct)
    {
        var userSiteId = User.FindFirstValue("siteId");

        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("X-Accel-Buffering", "no");

        var today = DateOnly.FromDateTime(DateTime.Now);

        var lastId = await _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Timestamp >= today.ToDateTime(TimeOnly.MinValue))
            .OrderByDescending(m => m.Id)
            .Select(m => (int?)m.Id)
            .FirstOrDefaultAsync(ct) ?? 0;

        await Response.WriteAsync(": connected\n\n", ct);
        await Response.Body.FlushAsync(ct);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (!ct.IsCancellationRequested && await timer.WaitForNextTickAsync(ct))
        {
            var nouveaux = await _mealLogRepo.GetAfterIdAsync(lastId, today);
            foreach (var passage in nouveaux)
            {
                lastId = passage.Id;
                if (userSiteId != null && passage.SiteId != userSiteId)
                    continue;
                var json = JsonSerializer.Serialize(passage, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                await Response.WriteAsync($"data: {json}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }
        }
    }
}
