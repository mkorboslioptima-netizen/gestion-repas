using Cantine.Core.DTOs;
using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface IMealLogRepository
{
    Task<MealLog> AddAsync(MealLog mealLog);
    Task<int> GetCountTodayAsync(string matricule, DateOnly date);
    Task<int> GetCountTodayBySiteAsync(string matricule, string siteId, DateOnly date);
    Task<IReadOnlyList<PassageDto>> GetHistoriqueJourAsync(DateOnly date, int limit = 50);
    Task<IReadOnlyList<MealLog>> GetAllTodayAsync(DateOnly date);
    Task<IReadOnlyList<PassageDto>> GetAfterIdAsync(int lastId, DateOnly date);
}
