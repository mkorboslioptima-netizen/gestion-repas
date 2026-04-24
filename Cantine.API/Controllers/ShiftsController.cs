using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/shifts")]
[Authorize]
public class ShiftsController(IShiftService shiftService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll() =>
        Ok(await shiftService.GetAllAsync());

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent() =>
        Ok(await shiftService.GetCurrentAsync(DateTime.Now));

    [HttpPut("{id:int}")]
    [Authorize(Roles = "AdminSEBN")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateShiftDto dto)
    {
        try { return Ok(await shiftService.UpdateAsync(id, dto)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }
}
