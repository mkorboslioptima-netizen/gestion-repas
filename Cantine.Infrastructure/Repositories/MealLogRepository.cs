using Cantine.Core.Entities;
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
}
