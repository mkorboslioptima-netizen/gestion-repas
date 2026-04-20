using Cantine.Core.DTOs;
using Cantine.Core.Entities;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AdminSEBN")]
public class SitesController : ControllerBase
{
    private readonly CantineDbContext _context;
    private readonly IMorphoEmployeeImporter _importer;

    public SitesController(CantineDbContext context, IMorphoEmployeeImporter importer)
    {
        _context = context;
        _importer = importer;
    }

    // GET /api/sites
    [HttpGet]
    [Authorize] // tous les rôles authentifiés
    public async Task<IActionResult> GetAll()
    {
        var sites = await _context.Sites.AsNoTracking().ToListAsync();
        var result = new List<SiteDto>();
        foreach (var s in sites)
        {
            var count = await _context.Employees.CountAsync(e => e.SiteId == s.SiteId && e.Actif);
            result.Add(new SiteDto { SiteId = s.SiteId, Nom = s.Nom, Actif = s.Actif, EmployeCount = count });
        }
        return Ok(result);
    }

    // POST /api/sites
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSiteDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.SiteId) || string.IsNullOrWhiteSpace(dto.Nom))
            return BadRequest(new { message = "SiteId et Nom sont obligatoires." });

        if (await _context.Sites.AnyAsync(s => s.SiteId == dto.SiteId))
            return Conflict(new { message = $"Un site avec l'identifiant '{dto.SiteId}' existe déjà." });

        var site = new Site { SiteId = dto.SiteId.Trim().ToUpper(), Nom = dto.Nom.Trim(), Actif = true };
        _context.Sites.Add(site);
        await _context.SaveChangesAsync();

        return Ok(new SiteDto { SiteId = site.SiteId, Nom = site.Nom, Actif = site.Actif, EmployeCount = 0 });
    }

    // PUT /api/sites/{siteId}
    [HttpPut("{siteId}")]
    public async Task<IActionResult> Update(string siteId, [FromBody] UpdateSiteDto dto)
    {
        var site = await _context.Sites.FindAsync(siteId);
        if (site is null) return NotFound(new { message = $"Site '{siteId}' introuvable." });

        site.Nom = dto.Nom.Trim();
        site.Actif = dto.Actif;
        await _context.SaveChangesAsync();

        var count = await _context.Employees.CountAsync(e => e.SiteId == siteId && e.Actif);
        return Ok(new SiteDto { SiteId = site.SiteId, Nom = site.Nom, Actif = site.Actif, EmployeCount = count });
    }

    // DELETE /api/sites/{siteId}
    [HttpDelete("{siteId}")]
    public async Task<IActionResult> Delete(string siteId)
    {
        var site = await _context.Sites.FindAsync(siteId);
        if (site is null) return NotFound(new { message = $"Site '{siteId}' introuvable." });

        var hasEmployees = await _context.Employees.AnyAsync(e => e.SiteId == siteId);
        if (hasEmployees)
            return BadRequest(new { message = "Impossible de supprimer un site qui contient des employés." });

        var hasLogs = await _context.MealLogs.AnyAsync(m => m.SiteId == siteId);
        if (hasLogs)
            return BadRequest(new { message = "Impossible de supprimer un site qui a des passages enregistrés." });

        _context.Sites.Remove(site);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    // POST /api/sites/{siteId}/sync
    [HttpPost("{siteId}/sync")]
    public async Task<IActionResult> SyncEmployees(string siteId)
    {
        var siteExists = await _context.Sites.AnyAsync(s => s.SiteId == siteId);
        if (!siteExists) return NotFound(new { message = $"Site '{siteId}' introuvable." });

        var hasConfig = await _context.MorphoConfigs.AnyAsync(c => c.SiteId == siteId);
        if (!hasConfig)
            return BadRequest(new { message = "Aucune configuration MorphoManager pour ce site. Configurez la connexion d'abord." });

        try
        {
            var result = await _importer.ImportAsync(siteId, desactiverAbsents: false, source: "Manual");
            var count = await _context.Employees.CountAsync(e => e.SiteId == siteId && e.Actif);
            return Ok(new
            {
                result.Importes,
                result.MisAJour,
                result.Desactives,
                result.Ignores,
                EmployeCount = count
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = $"Erreur de connexion MorphoManager : {ex.Message}" });
        }
    }

    // GET /api/sites/{siteId}/morpho-config
    [HttpGet("{siteId}/morpho-config")]
    public async Task<IActionResult> GetMorphoConfig(string siteId)
    {
        var config = await _context.MorphoConfigs.AsNoTracking().FirstOrDefaultAsync(c => c.SiteId == siteId);
        if (config is null) return NotFound();

        return Ok(new MorphoConfigDto
        {
            SiteId = config.SiteId,
            ConnectionString = config.ConnectionString,
            Query = config.Query,
            CommandTimeout = config.CommandTimeout
        });
    }

    // PUT /api/sites/{siteId}/morpho-config
    [HttpPut("{siteId}/morpho-config")]
    public async Task<IActionResult> UpsertMorphoConfig(string siteId, [FromBody] MorphoConfigDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);
        if (siteId != dto.SiteId) return BadRequest(new { message = "SiteId mismatch." });

        var siteExists = await _context.Sites.AnyAsync(s => s.SiteId == siteId);
        if (!siteExists) return NotFound(new { message = $"Site '{siteId}' introuvable." });

        var existing = await _context.MorphoConfigs.FindAsync(siteId);
        if (existing is null)
        {
            _context.MorphoConfigs.Add(new MorphoConfig
            {
                SiteId = dto.SiteId,
                ConnectionString = dto.ConnectionString,
                Query = dto.Query,
                CommandTimeout = dto.CommandTimeout
            });
        }
        else
        {
            existing.ConnectionString = dto.ConnectionString;
            existing.Query = dto.Query;
            existing.CommandTimeout = dto.CommandTimeout;
        }

        await _context.SaveChangesAsync();
        return Ok(dto);
    }
}
