using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Cantine.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AdminSEBN")]
public class EmployesController : ControllerBase
{
    private readonly IMorphoEmployeeImporter _importer;
    private readonly IMorphoSyncService _syncService;
    private readonly CantineDbContext _context;
    private readonly ExcelExportService _excelService;

    public EmployesController(IMorphoEmployeeImporter importer, IMorphoSyncService syncService, CantineDbContext context, ExcelExportService excelService)
    {
        _importer = importer;
        _syncService = syncService;
        _context = context;
        _excelService = excelService;
    }

    // POST /api/employes/import-morpho/{siteId}
    [HttpPost("import-morpho/{siteId}")]
    public async Task<IActionResult> ImportMorpho(string siteId)
    {
        try
        {
            var result = await _importer.ImportAsync(siteId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Erreur de connexion MorphoManager : {ex.Message}" });
        }
    }

    // GET /api/employes?siteId=
    [HttpGet]
    public async Task<IActionResult> GetEmployes([FromQuery] string siteId)
    {
        var query = _context.Employees
            .AsNoTracking()
            .Where(e => e.SiteId == siteId);

        var employes = await query
            .Select(e => new EmployeeDto
            {
                Matricule = e.Matricule,
                Nom = e.Nom,
                Prenom = e.Prenom,
                Actif = e.Actif,
                MaxMealsPerDay = e.MaxMealsPerDay
            })
            .OrderBy(e => e.Nom).ThenBy(e => e.Prenom)
            .ToListAsync();

        return Ok(employes);
    }

    // GET /api/employes/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var sites = await _context.Sites
            .AsNoTracking()
            .Where(s => s.Actif)
            .ToListAsync();

        var stats = new List<EmployeeSiteStatsDto>();

        foreach (var site in sites)
        {
            var totalActifs = await _context.Employees
                .AsNoTracking()
                .CountAsync(e => e.SiteId == site.SiteId && e.Actif);

            var dernierLog = await _context.SyncLogs
                .AsNoTracking()
                .Where(l => l.SiteId == site.SiteId)
                .OrderByDescending(l => l.OccurredAt)
                .Select(l => new SyncLogDto
                {
                    Id = l.Id,
                    SiteId = l.SiteId,
                    NomSite = site.Nom,
                    OccurredAt = l.OccurredAt,
                    Source = l.Source,
                    Importes = l.Importes,
                    MisAJour = l.MisAJour,
                    Desactives = l.Desactives,
                    Ignores = l.Ignores
                })
                .FirstOrDefaultAsync();

            stats.Add(new EmployeeSiteStatsDto
            {
                SiteId = site.SiteId,
                NomSite = site.Nom,
                TotalActifs = totalActifs,
                DerniereSynchro = dernierLog
            });
        }

        return Ok(stats);
    }

    // GET /api/employes/sync-logs/{siteId}
    [HttpGet("sync-logs/{siteId}")]
    public async Task<IActionResult> GetSyncLogs(string siteId)
    {
        var logs = await _context.SyncLogs
            .AsNoTracking()
            .Where(l => l.SiteId == siteId)
            .OrderByDescending(l => l.OccurredAt)
            .Take(10)
            .Join(_context.Sites, l => l.SiteId, s => s.SiteId, (l, s) => new SyncLogDto
            {
                Id = l.Id,
                SiteId = l.SiteId,
                NomSite = s.Nom,
                OccurredAt = l.OccurredAt,
                Source = l.Source,
                Importes = l.Importes,
                MisAJour = l.MisAJour,
                Desactives = l.Desactives,
                Ignores = l.Ignores
            })
            .ToListAsync();

        return Ok(logs);
    }

    // GET /api/employes/export?siteId=&search=&actif=&maxMealsPerDay=
    [HttpGet("export")]
    public async Task<IActionResult> ExportExcel(
        [FromQuery] string siteId,
        [FromQuery] string? search = null,
        [FromQuery] bool? actif = null,
        [FromQuery] int? maxMealsPerDay = null)
    {
        if (string.IsNullOrWhiteSpace(siteId))
            return BadRequest(new { message = "siteId requis" });

        var bytes = await _excelService.GenererExportEmployesAsync(siteId, search, actif, maxMealsPerDay);
        var fileName = $"employes-{siteId}-{DateTime.Now:yyyyMMdd}.xlsx";
        return File(bytes,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
    }

    // PATCH /api/employes/{matricule}/quota
    [HttpPatch("{matricule}/quota")]
    public async Task<IActionResult> UpdateQuota(string matricule, [FromBody] UpdateQuotaDto dto)
    {
        if (dto.MaxMealsPerDay < 1 || dto.MaxMealsPerDay > 10)
            return BadRequest(new { message = "Quota invalide (1–10)" });

        var employee = await _context.Employees
            .FirstOrDefaultAsync(e => e.Matricule == matricule);
        if (employee is null) return NotFound();

        employee.MaxMealsPerDay = dto.MaxMealsPerDay;
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/employes/sync-morpho
    // Déclenche la synchro de tous les sites en arrière-plan, retourne 202 immédiatement
    [HttpPost("sync-morpho")]
    public IActionResult SyncMorpho()
    {
        _ = Task.Run(async () =>
        {
            try { await _syncService.SyncAllSitesAsync(); }
            catch { /* logged inside SyncAllSitesAsync */ }
        });

        return Accepted(new { message = "Synchronisation lancée pour tous les sites configurés." });
    }
}
