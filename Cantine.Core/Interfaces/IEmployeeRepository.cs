using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface IEmployeeRepository
{
    Task<Employee?> GetByMatriculeAsync(string matricule);
    Task<Employee?> GetByMatriculeAndSiteAsync(string matricule, string siteId);
}
