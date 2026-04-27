using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface IEscPosService
{
    Task PrintTicketAsync(MealLog mealLog, Employee employee, Lecteur lecteur, int mealNumberToday);
}
