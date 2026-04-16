using Cantine.Core.Entities;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Repositories;

public class LecteurRepository : ILecteurRepository
{
    private readonly CantineDbContext _context;
    private readonly ISiteContext _siteContext;

    public LecteurRepository(CantineDbContext context, ISiteContext siteContext)
    {
        _context = context;
        _siteContext = siteContext;
    }

    private IQueryable<Lecteur> FilteredLecteurs =>
        _siteContext.SiteId is null
            ? _context.Lecteurs.AsNoTracking()
            : _context.Lecteurs.AsNoTracking().Where(l => l.SiteId == _siteContext.SiteId);

    public async Task<IEnumerable<Lecteur>> GetAllAsync()
        => await FilteredLecteurs.ToListAsync();

    public async Task<Lecteur?> GetByIdAsync(int id)
        => await FilteredLecteurs.FirstOrDefaultAsync(l => l.Id == id);

    public async Task<Lecteur?> GetByIpAsync(string adresseIP)
        => await FilteredLecteurs
            .FirstOrDefaultAsync(l => l.AdresseIP == adresseIP && l.Actif);

    public async Task<Lecteur> AddAsync(Lecteur lecteur)
    {
        _context.Lecteurs.Add(lecteur);
        await _context.SaveChangesAsync();
        return lecteur;
    }

    public async Task<Lecteur> UpdateAsync(Lecteur lecteur)
    {
        _context.Lecteurs.Update(lecteur);
        await _context.SaveChangesAsync();
        return lecteur;
    }

    public async Task DeleteAsync(int id)
    {
        var lecteur = await _context.Lecteurs.FindAsync(id);
        if (lecteur is not null)
        {
            _context.Lecteurs.Remove(lecteur);
            await _context.SaveChangesAsync();
        }
    }

    public async Task<bool> IpExistsAsync(string adresseIP, int? excludeId = null)
        => await _context.Lecteurs.AsNoTracking()
            .AnyAsync(l => l.AdresseIP == adresseIP && (excludeId == null || l.Id != excludeId));
}
