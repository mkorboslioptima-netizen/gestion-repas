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
builder.Services.AddScoped<IShiftService, ShiftService>();
builder.Services.AddScoped<IMealEligibilityService, MealEligibilityService>();
builder.Services.AddScoped<IMorphoEmployeeImporter, MorphoEmployeeImporter>();
builder.Services.AddScoped<IMorphoSyncService, MorphoSyncService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IImprimanteService, ImprimanteService>();
builder.Services.AddScoped<ImprimanteDiscoveryService>();
builder.Services.AddScoped<ExcelExportService>();
builder.Services.AddSingleton<IEscPosService, EscPosService>();
builder.Services.AddSingleton<IMorphoFrameParser, MorphoFrameParser>();
builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();
builder.Services.AddScoped<ISupervisionChecker, SupervisionChecker>();
builder.Services.AddHostedService<SupervisionBackgroundService>();

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
builder.Services.AddControllers()
    .AddJsonOptions(o =>
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(
                  "http://localhost:5173",
                  "http://localhost:5174",
                  "http://localhost:5175",
                  "http://localhost:5176")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
