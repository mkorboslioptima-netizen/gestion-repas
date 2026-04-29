using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using Cantine.Core.Entities;
using Cantine.Core.Interfaces;
using Cantine.Infrastructure.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Cantine.TcpListener;

public class MorphoListenerService : BackgroundService
{
    private const int TcpPort = 11020;

    private readonly ILogger<MorphoListenerService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMorphoFrameParser _parser;
    private readonly IEscPosService _escPosService;

    public MorphoListenerService(
        ILogger<MorphoListenerService> logger,
        IServiceScopeFactory scopeFactory,
        IMorphoFrameParser parser,
        IEscPosService escPosService)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _parser = parser;
        _escPosService = escPosService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var listener = new System.Net.Sockets.TcpListener(IPAddress.Any, TcpPort);
        listener.Start();
        _logger.LogInformation("[TCP] Écoute sur le port {Port}...", TcpPort);

        try
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                var client = await listener.AcceptTcpClientAsync(stoppingToken);
                _ = Task.Run(() => ProcessClientAsync(client, stoppingToken), stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            // Arrêt normal du service
        }
        finally
        {
            listener.Stop();
            _logger.LogInformation("[TCP] Listener arrêté.");
        }
    }

    private async Task ProcessClientAsync(TcpClient client, CancellationToken ct)
    {
        var remoteIp = (client.Client.RemoteEndPoint as IPEndPoint)?.Address.ToString() ?? "inconnue";
        _logger.LogInformation("[TCP] Connexion depuis {IP}", remoteIp);

        using (client)
        using (var stream = client.GetStream())
        {
            var buffer = new StringBuilder();
            var readBuffer = new byte[4096];

            try
            {
                int bytesRead;
                while ((bytesRead = await stream.ReadAsync(readBuffer, ct)) > 0)
                {
                    var chunk = Encoding.ASCII.GetString(readBuffer, 0, bytesRead);
                    _logger.LogInformation("[TCP] Données brutes de {IP} ({Bytes} octets) : [{Data}]",
                        remoteIp, bytesRead, chunk.Replace("\r", "\\r").Replace("\n", "\\n"));

                    buffer.Append(chunk);
                    var raw = buffer.ToString();

                    // Traiter si on a au moins une trame complète :
                    // terminée par '?' (idle) ou par 'O'/'I' précédé d'un chiffre (bouton pressé)
                    bool hasComplete = raw.Contains('?') || Regex.IsMatch(raw, @"\d[OI]");
                    if (!hasComplete)
                    {
                        _logger.LogDebug("[TCP] Trame incomplète depuis {IP}, buffer courant : [{Buffer}]",
                            remoteIp, raw.Replace("\r", "\\r").Replace("\n", "\\n"));
                        continue;
                    }

                    _logger.LogDebug("[Reçu brut de {IP}] : {Raw}", remoteIp, raw);

                    var frames = _parser.ParseFrames(raw).ToList();

                    // Trouver le dernier terminateur valide ('?' ou O/I précédé d'un chiffre)
                    int lastTerm = -1;
                    for (int i = raw.Length - 1; i >= 0; i--)
                    {
                        if (raw[i] == '?' ||
                            ((raw[i] == 'O' || raw[i] == 'I') && i > 0 && char.IsDigit(raw[i - 1])))
                        {
                            lastTerm = i;
                            break;
                        }
                    }
                    buffer.Clear();
                    if (lastTerm >= 0 && lastTerm < raw.Length - 1)
                        buffer.Append(raw[(lastTerm + 1)..]);

                    foreach (var frame in frames)
                    {
                        await HandleFrameAsync(frame, remoteIp, ct);
                    }
                }
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "[TCP] Erreur lors du traitement du client {IP}", remoteIp);
            }
        }

        _logger.LogInformation("[TCP] Connexion fermée depuis {IP}", remoteIp);
    }

    private async Task HandleFrameAsync(Core.DTOs.MorphoFrame frame, string remoteIp, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CantineDbContext>();
        var lecteurRepo = scope.ServiceProvider.GetRequiredService<ILecteurRepository>();
        var employeeRepo = scope.ServiceProvider.GetRequiredService<IEmployeeRepository>();
        var mealLogRepo = scope.ServiceProvider.GetRequiredService<IMealLogRepository>();
        var eligibilityService = scope.ServiceProvider.GetRequiredService<IMealEligibilityService>();

        // 1. Résolution du lecteur par IP
        var lecteur = await lecteurRepo.GetByIpAsync(remoteIp);
        if (lecteur is null)
        {
            _logger.LogWarning("[Trame] IP inconnue {IP} — trame ignorée", remoteIp);
            return;
        }

        _logger.LogDebug("[Trame] Lecteur trouvé : {Nom} (SiteId={SiteId})", lecteur.Nom, lecteur.SiteId);

        if (string.IsNullOrEmpty(lecteur.SiteId))
        {
            _logger.LogError("[Trame] Lecteur {Nom} ({IP}) sans SiteId — impossible de traiter la trame. Corrigez le lecteur dans l'interface.", lecteur.Nom, remoteIp);
            return;
        }

        // 2. Résolution Wiegand → EMPLOYEEID si la trame contient un Wiegand value
        var matricule = await ResolveMatriculeAsync(frame.Matricule, lecteur.SiteId, db, ct);

        // 3. Vérification éligibilité (scoped au site du lecteur)
        bool eligible = await eligibilityService.IsEligibleAsync(matricule, lecteur.SiteId, frame.Timestamp);
        if (!eligible)
        {
            _logger.LogDebug("[Trame] Employé {Matricule} non éligible sur site {SiteId}", matricule, lecteur.SiteId);
            return;
        }

        // 4. Récupération de l'employé (pour le ticket)
        var employee = await employeeRepo.GetByMatriculeAsync(matricule);
        if (employee is null)
        {
            _logger.LogWarning("[Trame] Employé {Matricule} introuvable", matricule);
            return;
        }

        // 5. Enregistrement du MealLog
        var mealLog = new MealLog
        {
            SiteId = lecteur.SiteId,
            Matricule = matricule,
            LecteurId = lecteur.Id,
            Timestamp = frame.Timestamp,
            RepasType = frame.RepasType
        };

        mealLog = await mealLogRepo.AddAsync(mealLog);
        _logger.LogInformation("[MealLog] Ticket #{TicketNumber} — {Matricule} — {RepasType} — {Lecteur}",
            mealLog.TicketNumber, mealLog.Matricule, mealLog.RepasType, lecteur.Nom);

        // 6. Calcul du compteur de repas du jour pour le ticket
        int mealNumberToday = 0;
        try
        {
            mealNumberToday = await mealLogRepo.GetCountTodayBySiteAsync(
                matricule, lecteur.SiteId, DateOnly.FromDateTime(frame.Timestamp));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[MealLog] Impossible de calculer le compteur de repas pour {Matricule}", matricule);
        }

        // 7. Impression ticket ESC/POS (échec non bloquant)
        await _escPosService.PrintTicketAsync(mealLog, employee, lecteur, mealNumberToday);
    }

    private async Task<string> ResolveMatriculeAsync(string rawValue, string siteId, CantineDbContext db, CancellationToken ct)
    {
        var config = await db.MorphoConfigs
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.SiteId == siteId, ct);

        if (config is null)
            return rawValue;

        try
        {
            await using var connection = new SqlConnection(config.ConnectionString);
            await connection.OpenAsync(ct);

            const string sql = """
                SELECT u.EMPLOYEEID
                FROM User_ u
                JOIN WiegandUserValue w ON w.OWNERID = u.ID
                WHERE w.VALUE = @value
                """;

            await using var cmd = new SqlCommand(sql, connection) { CommandTimeout = config.CommandTimeout };
            cmd.Parameters.AddWithValue("@value", rawValue);

            var result = await cmd.ExecuteScalarAsync(ct);
            if (result is string employeeId && !string.IsNullOrWhiteSpace(employeeId))
            {
                _logger.LogDebug("[Wiegand] {Wiegand} → EMPLOYEEID {Matricule}", rawValue, employeeId.Trim());
                return employeeId.Trim();
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Wiegand] Échec résolution {Wiegand} — utilisation valeur brute", rawValue);
        }

        return rawValue;
    }
}
