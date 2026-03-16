using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Hysj.Api.Controllers;

public record RelayNodeDto(string Address, byte[] PublicKey);

[ApiController]
[Route("api/relay")]
[Authorize]
public class RelayController(IConfiguration config) : ControllerBase
{
    [HttpGet("nodes")]
    public IActionResult GetNodes()
    {
        var nodes = config.GetSection("RelayNodes").Get<List<RelayNodeDto>>()
            ?? [];
        return Ok(nodes);
    }
}
