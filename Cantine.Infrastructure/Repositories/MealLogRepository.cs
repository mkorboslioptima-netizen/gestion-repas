using Cantine.Core.DTOs;
using Cantine.Core.Entities;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Repositories;

public class MealLogRepository : IMealLogRepository
{
    private readonly CantineDbContext _context;
    private readonly ISiteContext _siteContext;

    public MealLogRepository(CantineDbContext context, ISiteContext siteContext)
    {
        _context = context;
        _siteContext = siteContext;
    }

    public async Task<MealLog> AddAsync(MealLog mealLog)
    {
        _context.MealLogs.Add(mealLog);
        await _context.SaveChangesAsync();
        return mealLog;
    }

    public async Task<int> GetCountTodayAsync(string matricule, DateOnly date)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.ToDateTime(TimeOnly.MaxValue);

        var query = _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Matricule == matricule
                     && m.Timestamp >= start
                     && m.Timestamp <= end);

        if (_siteContext.SiteId is not null)
            query = query.Where(m => m.SiteId == _siteContext.SiteId);

        return await query.CountAsync();
    }

    public async Task<int> GetCountTodayBySiteAsync(string matricule, string siteId, DateOnly date)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.ToDateTime(TimeOnly.MaxValue);

        return await _context.MealLogs
            .AsNoTracking()
            .CountAsync(m => m.Matricule == matricule
                          && m.SiteId == siteId
                          && m.Timestamp >= start
                          && m.Timestamp <= end);
    }

    public async Task<IReadOnlyList<PassageDto>> GetHistoriqueJourAsync(DateOnly date, int limit = 50)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.ToDateTime(TimeOnly.MaxValue);

        var query = _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Timestamp >= start && m.Timestamp <= end);

        if (_siteContext.SiteId is not null)
            query = query.Where(m => m.SiteId == _siteContext.SiteId);

        var results = await query
            .OrderByDescending(m => m.Timestamp)
            .Take(limit)
            .Select(m => new PassageDto
            {
                Id = m.Id,
                Matricule = m.Matricule,
                Nom = m.Employee != null ? m.Employee.Nom : string.Empty,
                Prenom = m.Employee != null ? m.Employee.Prenom : string.Empty,
                Timestamp = m.Timestamp,
                RepasType = m.RepasType,
                LecteurNom = m.Lecteur != null ? m.Lecteur.Nom : string.Empty
            })
            .ToListAsync();

        return results.AsReadOnly();
    }

    public async Task<IReadOnlyList<MealLog>> GetAllTodayAsync(DateOnly date)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.ToDateTime(TimeOnly.MaxValue);

        var query = _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Timestamp >= start && m.Timestamp <= end);

        if (_siteContext.SiteId is not null)
            query = query.Where(m => m.SiteId == _siteContext.SiteId);

        return (await query.ToListAsync()).AsReadOnly();
    }

    public async Task<IReadOnlyList<PassageDto>> GetAfterIdAsync(int lastId, DateOnly date)
    {
        var start = date.ToDateTime(TimeOnly.MinValue);
        var end = date.ToDateTime(TimeOnly.MaxValue);

        var results = await _context.MealLogs
            .AsNoTracking()
            .Where(m => m.Id > lastId && m.Timestamp >= start && m.Timestamp <= end)
            .OrderBy(m => m.Id)
            .Select(m => new PassageDto
            {
                Id = m.Id,
                Matricule = m.Matricule,
                Nom = m.Employee != null ? m.Employee.Nom : string.Empty,
                Prenom = m.Employee != null ? m.Employee.Prenom : string.Empty,
                Timestamp = m.Timestamp,
                RepasType = m.RepasType,
                LecteurNom = m.Lecteur != null ? m.Lecteur.Nom : string.Empty
            })
            .ToListAsync();

        return results.AsReadOnly();
    }
}
