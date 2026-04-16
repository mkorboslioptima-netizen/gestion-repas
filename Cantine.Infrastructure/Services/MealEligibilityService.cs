using Cantine.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Services;

/// <summary>
/// Vérifie l'éligibilité d'un employé à prendre un repas.
/// Le filtrage par site est délégué aux repositories via ISiteContext.
/// </summary>
public class MealEligibilityService : IMealEligibilityService
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IMealLogRepository _mealLogRepository;
    private readonly ISiteContext _siteContext;
    private readonly ILogger<MealEligibilityService> _logger;

    public MealEligibilityService(
        IEmployeeRepository employeeRepository,
        IMealLogRepository mealLogRepository,
        ISiteContext siteContext,
        ILogger<MealEligibilityService> logger)
    {
        _employeeRepository = employeeRepository;
        _mealLogRepository = mealLogRepository;
        _siteContext = siteContext;
        _logger = logger;
    }

    public async Task<bool> IsEligibleAsync(string matricule, DateOnly date)
    {
        // Le repository filtre déjà par SiteId via ISiteContext
        var employee = await _employeeRepository.GetByMatriculeAsync(matricule);
        if (employee is null)
        {
            _logger.LogWarning("[Éligibilité] Refus — Employé inconnu : {Matricule} (site: {SiteId})",
                matricule, _siteContext.SiteId ?? "global");
            return false;
        }

        if (!employee.Actif)
        {
            _logger.LogWarning("[Éligibilité] Refus — Employé inactif : {Matricule} (site: {SiteId})",
                matricule, _siteContext.SiteId ?? "global");
            return false;
        }

        int count = await _mealLogRepository.GetCountTodayAsync(matricule, date);
        if (count >= employee.MaxMealsPerDay)
        {
            _logger.LogWarning("[Éligibilité] Refus — Quota journalier atteint pour {Matricule} ({Count}/{Max}) (site: {SiteId})",
                matricule, count, employee.MaxMealsPerDay, _siteContext.SiteId ?? "global");
            return false;
        }

        return true;
    }
}
