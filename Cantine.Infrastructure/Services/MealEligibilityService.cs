using Cantine.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Services;

public class MealEligibilityService : IMealEligibilityService
{
    private readonly IEmployeeRepository _employeeRepository;
    private readonly IMealLogRepository _mealLogRepository;
    private readonly IShiftService _shiftService;
    private readonly ILogger<MealEligibilityService> _logger;

    public MealEligibilityService(
        IEmployeeRepository employeeRepository,
        IMealLogRepository mealLogRepository,
        IShiftService shiftService,
        ILogger<MealEligibilityService> logger)
    {
        _employeeRepository = employeeRepository;
        _mealLogRepository = mealLogRepository;
        _shiftService = shiftService;
        _logger = logger;
    }

    public async Task<bool> IsEligibleAsync(string matricule, string siteId, DateTime timestamp)
    {
        var date = DateOnly.FromDateTime(timestamp);

        var employee = await _employeeRepository.GetByMatriculeAndSiteAsync(matricule, siteId);
        if (employee is null)
        {
            _logger.LogWarning("[Éligibilité] Refus — Employé inconnu : {Matricule} (site: {SiteId})",
                matricule, siteId);
            return false;
        }

        if (!employee.Actif)
        {
            _logger.LogWarning("[Éligibilité] Refus — Employé inactif : {Matricule} (site: {SiteId})",
                matricule, siteId);
            return false;
        }

        int count = await _mealLogRepository.GetCountTodayBySiteAsync(matricule, siteId, date);
        if (count >= employee.MaxMealsPerDay)
        {
            _logger.LogWarning("[Éligibilité] Refus — Quota journalier atteint pour {Matricule} ({Count}/{Max}) (site: {SiteId})",
                matricule, count, employee.MaxMealsPerDay, siteId);
            return false;
        }

        var currentShift = await _shiftService.GetCurrentAsync(timestamp);
        if (currentShift is null)
        {
            _logger.LogWarning("[Éligibilité] Refus — Hors créneau horaire pour {Matricule} à {Heure} (site: {SiteId})",
                matricule, timestamp.ToString("HH:mm"), siteId);
            return false;
        }

        return true;
    }
}
