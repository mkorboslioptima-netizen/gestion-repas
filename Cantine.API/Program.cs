using Cantine.Infrastructure.Data;
using Cantine.Infrastructure.Repositories;
using Cantine.Infrastructure.Printing;
using Cantine.Infrastructure.Tcp;
using Cantine.Infrastructure.Services;
using Cantine.Infrastructure.MorphoManager;
using Cantine.Core.Interfaces;
using Cantine.API.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CantineDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ISiteContext, HttpSiteContext>();

builder.Services.AddScoped<ILecteurRepository, LecteurRepository>();
builder.Services.AddScoped<ILecteurService, LecteurService>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IMealLogRepository, MealLogRepository>();
builder.Services.AddScoped<IMealEligibilityService, MealEligibilityService>();
builder.Services.AddScoped<IMorphoEmployeeImporter, MorphoEmployeeImporter>();
builder.Services.AddScoped<IMorphoSyncService, MorphoSyncService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddSingleton<IEscPosService, EscPosService>();
builder.Services.AddSingleton<IMorphoFrameParser, MorphoFrameParser>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is not configured.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

// TODO: retirer ce bloc avant mise en production
if (app.Environment.IsDevelopment())
{
    // Injecte automatiquement un utilisateur AdminSEBN sans token en dev
    app.Use(async (ctx, next) =>
    {
        var identity = new ClaimsIdentity(
        [
            new Claim(ClaimTypes.Name, "dev-admin"),
            new Claim(ClaimTypes.Role, "AdminSEBN"),
        ], authenticationType: "DevBypass");
        ctx.User = new ClaimsPrincipal(identity);
        await next();
    });
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
