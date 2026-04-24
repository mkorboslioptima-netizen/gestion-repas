using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface ISupervisionStore
{
    void Register(string id, string nom, string ip, string type);
    void UpdateStatus(string id, bool connecte);
    IEnumerable<EquipmentStatusDto> GetAll();
    event Action<EquipmentStatusDto>? OnStatusChanged;
}
