using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "AdminSEBN")]
public class ImprimantesController : ControllerBase
{
    private readonly IImprimanteService _service;
    private readonly ImprimanteDiscoveryService _discoveryService;

    public ImprimantesController(IImprimanteService service, ImprimanteDiscoveryService discoveryService)
    {
        _service = service;
        _discoveryService = discoveryService;
    }

    // GET /api/imprimantes
    [HttpGet]
    public async Task<IActionResult> GetAll()
        => Ok(await _service.GetAllAsync());

    // PUT /api/imprimantes/{lecteurId}
    [HttpPut("{lecteurId:int}")]
    public async Task<IActionResult> Update(int lecteurId, [FromBody] UpdateImprimanteDto dto)
    {
        try
        {
            var result = await _service.UpdateAsync(lecteurId, dto);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // POST /api/imprimantes/{lecteurId}/test
    [HttpPost("{lecteurId:int}/test")]
    public async Task<IActionResult> Test(int lecteurId)
    {
        try
        {
            var result = await _service.TestConnexionAsync(lecteurId);
            return Ok(result);
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    // POST /api/imprimantes/discover
    [HttpPost("discover")]
    public async Task<IActionResult> Discover()
    {
        var (results, subnetCount) = await _discoveryService.DiscoverAsync();
        Response.Headers["X-Scan-Subnets"] = subnetCount.ToString();
        return Ok(results);
    }
}
