using System.Net.Sockets;
using System.Text;
using Cantine.Core.Entities;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Printing;

public class EscPosService : IEscPosService
{
    private const int TimeoutMs = 3000;

    private readonly ILogger<EscPosService> _logger;

    public EscPosService(ILogger<EscPosService> logger)
    {
        _logger = logger;
    }

    public async Task PrintTicketAsync(MealLog mealLog, Employee employee, Lecteur lecteur, int mealNumberToday)
    {
        if (string.IsNullOrWhiteSpace(lecteur.PrinterIP))
        {
            _logger.LogWarning("[ESC/POS] Aucune imprimante configurée pour le lecteur '{Lecteur}'", lecteur.Nom);
            return;
        }

        try
        {
            using var client = new TcpClient();
            client.SendTimeout = TimeoutMs;
            int port = lecteur.PortImprimante > 0 ? lecteur.PortImprimante : 9100;
            await client.ConnectAsync(lecteur.PrinterIP, port);

            using var stream = client.GetStream();
            var data = BuildTicket(mealLog, employee, lecteur, mealNumberToday);
            await stream.WriteAsync(data);
            await stream.FlushAsync();

            _logger.LogInformation("[ESC/POS] Ticket #{TicketNumber} imprimé sur {PrinterIP}",
                mealLog.TicketNumber, lecteur.PrinterIP);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[ESC/POS] Échec impression ticket #{TicketNumber} sur {PrinterIP}",
                mealLog.TicketNumber, lecteur.PrinterIP);
        }
    }

    private static byte[] BuildTicket(MealLog mealLog, Employee employee, Lecteur lecteur, int mealNumberToday)
    {
        var enc = Encoding.GetEncoding(1252);
        using var ms = new MemoryStream();

        // Initialisation
        ms.Write(new byte[] { 0x1B, 0x40 });

        // ── En-tête : SiteId en double largeur+hauteur, centré ──
        ms.Write(new byte[] { 0x1B, 0x61, 0x01 }); // centré
        ms.Write(new byte[] { 0x1D, 0x21, 0x11 }); // double H+L
        ms.Write(enc.GetBytes($"{lecteur.SiteId}\n"));
        ms.Write(new byte[] { 0x1D, 0x21, 0x00 }); // taille normale
        ms.Write(enc.GetBytes("================================\n"));

        // ── Nom employé en gras, centré ──
        ms.Write(new byte[] { 0x1B, 0x45, 0x01 }); // gras ON
        ms.Write(enc.GetBytes($"{employee.Nom} {employee.Prenom}\n"));
        ms.Write(new byte[] { 0x1B, 0x45, 0x00 }); // gras OFF

        // ── Détails, alignement gauche ──
        ms.Write(new byte[] { 0x1B, 0x61, 0x00 }); // gauche
        ms.Write(enc.GetBytes(
            $"Matricule : {employee.Matricule}\n" +
            $"Date      : {mealLog.Timestamp:dd/MM/yyyy}\n" +
            $"Heure     : {mealLog.Timestamp:HH:mm:ss}\n" +
            $"Zone      : {lecteur.Nom}\n"));

        ms.Write(enc.GetBytes("================================\n"));

        // ── Type de repas en double largeur+hauteur, centré ──
        ms.Write(new byte[] { 0x1B, 0x61, 0x01 }); // centré
        ms.Write(new byte[] { 0x1D, 0x21, 0x11 }); // double H+L
        string typeRepas = mealLog.RepasType == RepasType.PlatChaud ? "PLAT CHAUD" : "SANDWICH";
        ms.Write(enc.GetBytes($"{typeRepas}\n"));
        ms.Write(new byte[] { 0x1D, 0x21, 0x00 }); // taille normale

        // ── Compteur de repas du jour ──
        string compteur = mealNumberToday > 0
            ? $"Repas  : {mealNumberToday} / {employee.MaxMealsPerDay}  ce jour"
            : $"Repas  : ? / {employee.MaxMealsPerDay}  ce jour";
        ms.Write(enc.GetBytes($"{compteur}\n"));

        ms.Write(new byte[] { 0x1B, 0x61, 0x00 }); // gauche
        ms.Write(enc.GetBytes($"Ticket N\xB0 {mealLog.TicketNumber:D5}\n"));
        ms.Write(enc.GetBytes("================================\n"));

        // ── Pied de page centré ──
        ms.Write(new byte[] { 0x1B, 0x61, 0x01 }); // centré
        ms.Write(enc.GetBytes("Bon appetit !\n"));

        // Saut de ligne + coupe papier partielle
        ms.Write(new byte[] { 0x1B, 0x64, 0x04 });
        ms.Write(new byte[] { 0x1D, 0x56, 0x42, 0x00 });

        return ms.ToArray();
    }
}
