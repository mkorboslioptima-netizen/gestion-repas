using System.Collections.Concurrent;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;

namespace Cantine.Infrastructure.Services;

public class SupervisionStore : ISupervisionStore
{
    private readonly ConcurrentDictionary<string, EquipmentStatusDto> _statuses = new();

    public event Action<EquipmentStatusDto>? OnStatusChanged;

    public void Register(string id, string nom, string ip, string type)
    {
        _statuses.TryAdd(id, new EquipmentStatusDto(id, nom, ip, type, false, DateTime.UtcNow));
    }

    public void UpdateStatus(string id, bool connecte)
    {
        _statuses.AddOrUpdate(id,
            key => new EquipmentStatusDto(key, key, "", "unknown", connecte, DateTime.UtcNow),
            (key, existing) =>
            {
                var updated = existing with { Connecte = connecte, DernierCheck = DateTime.UtcNow };
                if (existing.Connecte != connecte)
                    OnStatusChanged?.Invoke(updated);
                return updated;
            });
    }

    public IEnumerable<EquipmentStatusDto> GetAll() => _statuses.Values.OrderBy(e => e.Type).ThenBy(e => e.Nom);
}
