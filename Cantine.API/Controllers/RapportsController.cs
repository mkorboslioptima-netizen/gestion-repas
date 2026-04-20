using Cantine.Core.Enums;
using Cantine.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/rapports")]
[Authorize(Roles = "AdminSEBN,Prestataire")]
public class RapportsController : ControllerBase
{
    private readonly CantineDbContext _context;

    public RapportsController(CantineDbContext context)
    {
        _context = context;
    }

    // GET /api/rapports/prestataire/mensuel?annee=2026&mois=4
    [HttpGet("prestataire/mensuel")]
    public async Task<IActionResult> GetRecapMensuel([FromQuery] int annee, [FromQuery] int mois)
    {
        if (annee < 2020 || annee > 2100 || mois < 1 || mois > 12)
            return BadRequest(new { message = "Paramètres annee/mois invalides." });

        var debut = new DateTime(annee, mois, 1);
        var fin   = debut.AddMonths(1);

        var passages = await _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Timestamp >= debut && m.Timestamp < fin)
            .ToListAsync();

        var result = passages
            .GroupBy(m => DateOnly.FromDateTime(m.Timestamp))
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                date        = g.Key.ToString("yyyy-MM-dd"),
                platsChauds = g.Count(m => m.RepasType == RepasType.PlatChaud),
                sandwichs   = g.Count(m => m.RepasType == RepasType.Sandwich),
                total       = g.Count()
            })
            .ToList();

        return Ok(result);
    }
}
