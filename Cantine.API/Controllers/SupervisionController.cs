using System.Text.Json;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cantine.API.Controllers;

[ApiController]
[Route("api/supervision")]
[Authorize]
public class SupervisionController(ISupervisionStore store, ISupervisionChecker checker) : ControllerBase
{
    [HttpGet("status")]
    public IActionResult GetStatus() => Ok(store.GetAll());

    [HttpPost("check/{lecteurId:int}")]
    public async Task<IActionResult> CheckNow(int lecteurId, CancellationToken ct)
    {
        var result = await checker.CheckLecteurAsync(lecteurId, ct);
        if (result is null) return NotFound();
        return Ok(new { lecteur = result.Lecteur, imprimante = result.Imprimante });
    }

    [HttpGet("stream")]
    public async Task Stream(CancellationToken ct)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["X-Accel-Buffering"] = "no";

        var tcs = new TaskCompletionSource();

        void OnChange(EquipmentStatusDto dto)
        {
            var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            });
            Response.WriteAsync($"data: {json}\n\n", ct).GetAwaiter().GetResult();
            Response.Body.FlushAsync(ct).GetAwaiter().GetResult();
        }

        store.OnStatusChanged += OnChange;
        ct.Register(() => tcs.TrySetResult());

        try
        {
            await tcs.Task;
        }
        finally
        {
            store.OnStatusChanged -= OnChange;
        }
    }
}
