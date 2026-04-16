using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AdminSEBN")]
public class EmployesController : ControllerBase
{
    private readonly IMorphoEmployeeImporter _importer;
    private readonly IMorphoSyncService _syncService;

    public EmployesController(IMorphoEmployeeImporter importer, IMorphoSyncService syncService)
    {
        _importer = importer;
        _syncService = syncService;
    }

    // POST /api/employes/import-morpho/{siteId}
    [HttpPost("import-morpho/{siteId}")]
    public async Task<IActionResult> ImportMorpho(string siteId)
    {
        try
        {
            var result = await _importer.ImportAsync(siteId);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(502, new { message = $"Erreur de connexion MorphoManager : {ex.Message}" });
        }
    }

    // POST /api/employes/sync-morpho
    // Déclenche la synchro de tous les sites en arrière-plan, retourne 202 immédiatement
    [HttpPost("sync-morpho")]
    public IActionResult SyncMorpho()
    {
        _ = Task.Run(async () =>
        {
            try { await _syncService.SyncAllSitesAsync(); }
            catch { /* logged inside SyncAllSitesAsync */ }
        });

        return Accepted(new { message = "Synchronisation lancée pour tous les sites configurés." });
    }
}
