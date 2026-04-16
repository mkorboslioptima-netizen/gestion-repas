using Cantine.Core.DTOs;
using Cantine.Core.Entities;
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

    public SitesController(CantineDbContext context)
    {
        _context = context;
    }

    // GET /api/sites
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sites = await _context.Sites
            .AsNoTracking()
            .Select(s => new SiteDto
            {
                SiteId = s.SiteId,
                Nom = s.Nom,
                Actif = s.Actif
            })
            .ToListAsync();

        return Ok(sites);
    }

    // GET /api/sites/{siteId}/morpho-config
    [HttpGet("{siteId}/morpho-config")]
    public async Task<IActionResult> GetMorphoConfig(string siteId)
    {
        var config = await _context.MorphoConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.SiteId == siteId);

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
