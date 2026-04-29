using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Cantine.Infrastructure.Printing;
using Cantine.Infrastructure.Repositories;
using Cantine.Infrastructure.Tcp;
using Cantine.Infrastructure.Services;
using Cantine.Infrastructure.MorphoManager;
using Cantine.TcpListener;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
var builder = Host.CreateApplicationBuilder(args);

builder.Services.AddWindowsService(options =>
{
    options.ServiceName = "CantineTcpService";
});

builder.Services.AddDbContext<CantineDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// ISiteContext : NullSiteContext pour le service Windows (pas de requête HTTP)
// Le MorphoSyncService filtre explicitement par siteId — pas de filtrage implicite nécessaire
builder.Services.AddScoped<ISiteContext, NullSiteContext>();

// Repositories (Scoped)
builder.Services.AddScoped<ILecteurRepository, LecteurRepository>();
builder.Services.AddScoped<IEmployeeRepository, EmployeeRepository>();
builder.Services.AddScoped<IMealLogRepository, MealLogRepository>();

// Services métier (Scoped via scope factory dans le BackgroundService)
builder.Services.AddScoped<IMealEligibilityService, MealEligibilityService>();
builder.Services.AddScoped<IMorphoEmployeeImporter, MorphoEmployeeImporter>();
builder.Services.AddScoped<IMorphoSyncService, MorphoSyncService>();

// Singletons (stateless, thread-safe)
builder.Services.AddSingleton<IMorphoFrameParser, MorphoFrameParser>();
builder.Services.AddSingleton<ISupervisionStore, SupervisionStore>();

// Supervision
builder.Services.AddScoped<ISupervisionChecker, SupervisionChecker>();

// Impression : mode Pdf (dev) ou EscPos (prod) selon appsettings.json > Printing:Mode
builder.Services.Configure<PrintingOptions>(
    builder.Configuration.GetSection(PrintingOptions.SectionName));

var printingMode = builder.Configuration
    .GetSection(PrintingOptions.SectionName)["Mode"] ?? "EscPos";

if (printingMode.Equals("Pdf", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IEscPosService, PdfTicketService>();
else
    builder.Services.AddSingleton<IEscPosService, EscPosService>();

// Services hébergés
builder.Services.AddHostedService<MorphoListenerService>();
builder.Services.AddHostedService<MorphoSyncBackgroundService>();
builder.Services.AddHostedService<SupervisionBackgroundService>();

var host = builder.Build();
host.Run();
