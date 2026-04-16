using Cantine.Core.DTOs;
using Cantine.Core.Entities;
using Cantine.Core.Interfaces;

namespace Cantine.API.Services;

public class LecteurService : ILecteurService
{
    private readonly ILecteurRepository _repository;

    public LecteurService(ILecteurRepository repository)
    {
        _repository = repository;
    }

    public async Task<IEnumerable<LecteurDto>> GetAllAsync()
    {
        var lecteurs = await _repository.GetAllAsync();
        return lecteurs.Select(ToDto);
    }

    public async Task<LecteurDto?> GetByIdAsync(int id)
    {
        var lecteur = await _repository.GetByIdAsync(id);
        return lecteur is null ? null : ToDto(lecteur);
    }

    public async Task<LecteurDto> CreateAsync(CreateLecteurDto dto)
    {
        if (await _repository.IpExistsAsync(dto.AdresseIP))
            throw new InvalidOperationException($"Un lecteur avec l'adresse IP '{dto.AdresseIP}' existe déjà.");

        var lecteur = new Lecteur
        {
            Nom = dto.Nom,
            AdresseIP = dto.AdresseIP,
            Actif = true
        };

        var created = await _repository.AddAsync(lecteur);
        return ToDto(created);
    }

    public async Task<LecteurDto> UpdateAsync(int id, UpdateLecteurDto dto)
    {
        var lecteur = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Lecteur {id} introuvable.");

        if (await _repository.IpExistsAsync(dto.AdresseIP, excludeId: id))
            throw new InvalidOperationException($"Un lecteur avec l'adresse IP '{dto.AdresseIP}' existe déjà.");

        lecteur.Nom = dto.Nom;
        lecteur.AdresseIP = dto.AdresseIP;
        lecteur.Actif = dto.Actif;

        var updated = await _repository.UpdateAsync(lecteur);
        return ToDto(updated);
    }

    public async Task DeleteAsync(int id)
    {
        var lecteur = await _repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException($"Lecteur {id} introuvable.");

        // La vérification des pointages liés sera ajoutée quand la table Pointages existera
        await _repository.DeleteAsync(id);
    }

    private static LecteurDto ToDto(Lecteur l) => new()
    {
        Id = l.Id,
        Nom = l.Nom,
        AdresseIP = l.AdresseIP,
        Actif = l.Actif
    };
}
