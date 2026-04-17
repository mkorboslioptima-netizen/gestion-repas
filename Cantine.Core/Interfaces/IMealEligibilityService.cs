namespace Cantine.Core.Interfaces;

public interface IMealEligibilityService
{
    Task<bool> IsEligibleAsync(string matricule, string siteId, DateOnly date);
}
