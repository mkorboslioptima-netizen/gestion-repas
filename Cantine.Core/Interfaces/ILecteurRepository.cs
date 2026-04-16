using Cantine.Core.Entities;

namespace Cantine.Core.Interfaces;

public interface ILecteurRepository
{
    Task<IEnumerable<Lecteur>> GetAllAsync();
    Task<Lecteur?> GetByIdAsync(int id);
    Task<Lecteur?> GetByIpAsync(string adresseIP);
    Task<Lecteur> AddAsync(Lecteur lecteur);
    Task<Lecteur> UpdateAsync(Lecteur lecteur);
    Task DeleteAsync(int id);
    Task<bool> IpExistsAsync(string adresseIP, int? excludeId = null);
}
