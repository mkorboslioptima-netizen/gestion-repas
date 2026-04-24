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

    public async Task PrintTicketAsync(MealLog mealLog, Employee employee, Lecteur lecteur)
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
            var data = BuildTicket(mealLog, employee, lecteur);
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

    private static byte[] BuildTicket(MealLog mealLog, Employee employee, Lecteur lecteur)
    {
        using var ms = new MemoryStream();

        // ESC/POS : Initialisation
        ms.Write(new byte[] { 0x1B, 0x40 });

        // Centrage
        ms.Write(new byte[] { 0x1B, 0x61, 0x01 });

        // Double hauteur + largeur pour l'en-tête
        ms.Write(new byte[] { 0x1D, 0x21, 0x11 });
        ms.Write(Encoding.GetEncoding(1252).GetBytes("CANTINE SEBN\n"));

        // Retour taille normale
        ms.Write(new byte[] { 0x1D, 0x21, 0x00 });
        ms.Write(Encoding.GetEncoding(1252).GetBytes("--------------------------------\n"));

        // Alignement gauche
        ms.Write(new byte[] { 0x1B, 0x61, 0x00 });

        ms.Write(Encoding.GetEncoding(1252).GetBytes(
            $"Matricule : {employee.Matricule}\n" +
            $"Nom       : {employee.Nom} {employee.Prenom}\n" +
            $"Date      : {mealLog.Timestamp:dd/MM/yyyy}\n" +
            $"Heure     : {mealLog.Timestamp:HH:mm:ss}\n" +
            $"Zone      : {lecteur.Nom}\n"));

        ms.Write(Encoding.GetEncoding(1252).GetBytes("--------------------------------\n"));

        // Centrage + double largeur pour le type de repas
        ms.Write(new byte[] { 0x1B, 0x61, 0x01, 0x1D, 0x21, 0x11 });
        string typeRepas = mealLog.RepasType == RepasType.PlatChaud ? "PLAT CHAUD" : "SANDWICH FROID";
        ms.Write(Encoding.GetEncoding(1252).GetBytes($"{typeRepas}\n"));

        // Retour taille normale + centrage
        ms.Write(new byte[] { 0x1D, 0x21, 0x00 });
        ms.Write(Encoding.GetEncoding(1252).GetBytes($"Ticket N° {mealLog.TicketNumber:D5}\n"));
        ms.Write(Encoding.GetEncoding(1252).GetBytes("--------------------------------\n"));

        // Saut de ligne + coupe papier partielle
        ms.Write(new byte[] { 0x1B, 0x64, 0x04 }); // 4 sauts de ligne
        ms.Write(new byte[] { 0x1D, 0x56, 0x42, 0x00 }); // coupe partielle

        return ms.ToArray();
    }
}
