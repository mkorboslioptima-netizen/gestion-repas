using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[AllowAnonymous] // TODO: remettre [Authorize(Roles = "AdminSEBN")] avant la mise en production
public class LecteursController : ControllerBase
{
    private readonly ILecteurService _service;

    public LecteursController(ILecteurService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var lecteurs = await _service.GetAllAsync();
        return Ok(lecteurs);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var lecteur = await _service.GetByIdAsync(id);
        if (lecteur is null) return NotFound();
        return Ok(lecteur);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLecteurDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var created = await _service.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLecteurDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        try
        {
            var updated = await _service.UpdateAsync(id, dto);
            return Ok(updated);
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _service.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }
}
