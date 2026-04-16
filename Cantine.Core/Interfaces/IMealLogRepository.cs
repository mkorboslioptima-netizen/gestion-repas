using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface IMealLogRepository
{
    Task<MealLog> AddAsync(MealLog mealLog);
    Task<int> GetCountTodayAsync(string matricule, DateOnly date);
}
