using System.Text.Json;
using Cantine.Core.DTOs;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
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

    public RepasController(IMealLogRepository mealLogRepo, CantineDbContext context)
    {
        _mealLogRepo = mealLogRepo;
        _context = context;
    }

    // GET /api/repas/historique-jour?limit=50
    [HttpGet("historique-jour")]
    public async Task<IActionResult> GetHistoriqueJour([FromQuery] int limit = 50)
    {
        var today = DateOnly.FromDateTime(DateTime.Now);
        var historique = await _mealLogRepo.GetHistoriqueJourAsync(today, Math.Clamp(limit, 1, 200));
        return Ok(historique);
    }

    // GET /api/repas/stats-jour
    [HttpGet("stats-jour")]
    public async Task<IActionResult> GetStatsJour()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var sites = await _context.Sites
            .AsNoTracking()
            .Where(s => s.Actif)
            .ToListAsync();

        var start = today.ToDateTime(TimeOnly.MinValue);
        var end = today.ToDateTime(TimeOnly.MaxValue);

        var stats = new List<RepasStatsDto>();

        foreach (var site in sites)
        {
            var logs = await _context.MealLogs
                .AsNoTracking()
                .Where(m => m.SiteId == site.SiteId && m.Timestamp >= start && m.Timestamp <= end)
                .ToListAsync();

            // Employés ayant atteint leur quota
            var matricules = logs.Select(l => l.Matricule).Distinct();
            int quotaAtteint = 0;
            foreach (var matricule in matricules)
            {
                var employee = await _context.Employees
                    .AsNoTracking()
                    .FirstOrDefaultAsync(e => e.SiteId == site.SiteId && e.Matricule == matricule);
                if (employee is not null && logs.Count(l => l.Matricule == matricule) >= employee.MaxMealsPerDay)
                    quotaAtteint++;
            }

            stats.Add(new RepasStatsDto
            {
                SiteId = site.SiteId,
                NomSite = site.Nom,
                TotalPassages = logs.Count,
                PlatChaud = logs.Count(l => l.RepasType == RepasType.PlatChaud),
                Sandwich = logs.Count(l => l.RepasType == RepasType.Sandwich),
                QuotaAtteint = quotaAtteint
            });
        }

        return Ok(stats);
    }

    // GET /api/repas/flux  — SSE avec DB polling toutes les secondes
    [HttpGet("flux")]
    public async Task GetFlux(CancellationToken ct)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("X-Accel-Buffering", "no");

        var today = DateOnly.FromDateTime(DateTime.Now);

        // Initialiser lastId au dernier MealLog existant du jour
        var lastId = await _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Timestamp >= today.ToDateTime(TimeOnly.MinValue))
            .OrderByDescending(m => m.Id)
            .Select(m => (int?)m.Id)
            .FirstOrDefaultAsync(ct) ?? 0;

        // Émettre un commentaire keep-alive initial
        await Response.WriteAsync(": connected\n\n", ct);
        await Response.Body.FlushAsync(ct);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(1));

        while (!ct.IsCancellationRequested && await timer.WaitForNextTickAsync(ct))
        {
            var nouveaux = await _mealLogRepo.GetAfterIdAsync(lastId, today);
            foreach (var passage in nouveaux)
            {
                lastId = passage.Id;
                var json = JsonSerializer.Serialize(passage, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                await Response.WriteAsync($"data: {json}\n\n", ct);
                await Response.Body.FlushAsync(ct);
            }

            if (!nouveaux.Any())
            {
                // Keep-alive toutes les 15s si pas de données
                // (géré implicitement par le timer — pas besoin de commentaire supplémentaire)
            }
        }
    }
}
