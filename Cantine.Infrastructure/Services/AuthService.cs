using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Cantine.Core.DTOs;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Cantine.Infrastructure.Services;

public class AuthService : IAuthService
{
    private readonly CantineDbContext _context;
    private readonly IConfiguration _config;

    public AuthService(CantineDbContext context, IConfiguration config)
    {
        _context = context;
        _config = config;
    }

    public async Task<LoginResultDto?> LoginAsync(LoginDto dto)
    {
        var user = await _context.AppUsers
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Email == dto.Email);

        if (user is null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return null;

        var token = GenerateJwt(user.Email, user.Nom, user.Role, user.SiteId);

        return new LoginResultDto
        {
            Token = token,
            Nom = user.Nom,
            Role = user.Role,
            SiteId = user.SiteId
        };
    }

    private string GenerateJwt(string email, string nom, string role, string? siteId)
    {
        var secret = _config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
        var issuer   = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, email),
            new(JwtRegisteredClaimNames.Name, nom),
            new(ClaimTypes.Role, role),               // pour [Authorize(Roles=...)]
            new("role", role),                         // pour le frontend (décodage base64)
        };

        if (siteId is not null)
            claims.Add(new Claim("siteId", siteId));

        var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer:   issuer,
            audience: audience,
            claims:   claims,
            expires:  DateTime.UtcNow.AddHours(8),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
