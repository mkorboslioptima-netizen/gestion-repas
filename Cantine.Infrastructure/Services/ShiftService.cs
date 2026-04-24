using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Cantine.Infrastructure.Services;

public class ShiftService(CantineDbContext db) : IShiftService
{
    public async Task<IEnumerable<ShiftDto>> GetAllAsync()
    {
        var now = TimeOnly.FromDateTime(DateTime.Now);
        return await db.ShiftConfigs
            .OrderBy(s => s.HeureDebut)
            .Select(s => new ShiftDto(
                s.Id, s.Nom, s.HeureDebut, s.HeureFin, s.Actif,
                s.Actif && s.HeureDebut <= now && now < s.HeureFin))
            .ToListAsync();
    }

    public async Task<ShiftDto?> GetCurrentAsync(DateTime now)
    {
        var time = TimeOnly.FromDateTime(now);
        var shift = await db.ShiftConfigs
            .Where(s => s.Actif && s.HeureDebut <= time && time < s.HeureFin)
            .FirstOrDefaultAsync();
        if (shift is null) return null;
        return new ShiftDto(shift.Id, shift.Nom, shift.HeureDebut, shift.HeureFin, true, true);
    }

    public async Task<ShiftDto> UpdateAsync(int id, UpdateShiftDto dto)
    {
        var shift = await db.ShiftConfigs.FindAsync(id)
            ?? throw new KeyNotFoundException($"Shift {id} introuvable");
        shift.HeureDebut = dto.HeureDebut;
        shift.HeureFin = dto.HeureFin;
        shift.Actif = dto.Actif;
        await db.SaveChangesAsync();
        var now = TimeOnly.FromDateTime(DateTime.Now);
        return new ShiftDto(shift.Id, shift.Nom, shift.HeureDebut, shift.HeureFin, shift.Actif,
            shift.Actif && shift.HeureDebut <= now && now < shift.HeureFin);
    }
}
