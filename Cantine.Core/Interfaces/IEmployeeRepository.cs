using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface IEmployeeRepository
{
    Task<Employee?> GetByMatriculeAsync(string matricule);
}
