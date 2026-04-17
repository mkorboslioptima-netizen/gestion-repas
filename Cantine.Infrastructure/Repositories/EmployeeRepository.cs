using Cantine.Core.Entities;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Repositories;

public class EmployeeRepository : IEmployeeRepository
{
    private readonly CantineDbContext _context;
    private readonly ISiteContext _siteContext;

    public EmployeeRepository(CantineDbContext context, ISiteContext siteContext)
    {
        _context = context;
        _siteContext = siteContext;
    }

    public async Task<Employee?> GetByMatriculeAsync(string matricule)
    {
        var query = _context.Employees.AsNoTracking()
            .Where(e => e.Matricule == matricule);

        if (_siteContext.SiteId is not null)
            query = query.Where(e => e.SiteId == _siteContext.SiteId);

        return await query.FirstOrDefaultAsync();
    }

    public async Task<Employee?> GetByMatriculeAndSiteAsync(string matricule, string siteId)
    {
        return await _context.Employees.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Matricule == matricule && e.SiteId == siteId);
    }
}
