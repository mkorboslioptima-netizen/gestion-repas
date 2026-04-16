using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Data.SqlClient;
using System.Collections.Generic;
using System.Timers;
namespace SoapHoroquartz
{
    class Program
    {
        static string connectionString;
        static string logFilePath;
        static System.Timers.Timer retryTimer;

        static async Task Main(string[] args)
        {
            var config = ReadIni("config.ini");
            connectionString = config["Database"]["ConnectionString"];
            logFilePath = config["Log"]["LogFilePath"];
            string url = config["SOAP"]["Url"];
            string username = config["SOAP"]["Username"];
            string password = config["SOAP"]["Password"];
            string impersonation = config["SOAP"]["Impersonation"];
            int tcpPort = int.Parse(config["Timer"]["TCPPort"]);
            int retryIntervalMinutes = int.Parse(config["Timer"]["RetryIntervalMinutes"]);

            string credentials = Convert.ToBase64String(Encoding.UTF8.GetBytes($"{username}:{password}"));

            TcpListener listener = new TcpListener(IPAddress.Any, 11020);
            listener.Start();
            Console.WriteLine($"[TCP] En écoute sur le port {tcpPort}...");

            var httpClient = new HttpClient();
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials);

            retryTimer = new System.Timers.Timer(retryIntervalMinutes * 60 * 1000);
            retryTimer.Elapsed += async (sender, e) => await RetryFailedPointagesAsync(httpClient, url, impersonation);
            retryTimer.AutoReset = true;
            retryTimer.Enabled = true;

            while (true)
            {
                var client = await listener.AcceptTcpClientAsync();
                _ = Task.Run(() => ProcessClientAsync(client, httpClient, url, impersonation));
            }
        }
        static async Task ProcessClientAsync(TcpClient client, HttpClient httpClient, string url, string impersonation)
        {
            using (client)
            using (var stream = client.GetStream())
            {
                byte[] buffer = new byte[4096];
                int bytesRead = await stream.ReadAsync(buffer, 0, buffer.Length);
                string receivedMessage = Encoding.ASCII.GetString(buffer, 0, bytesRead).Trim();
                Console.WriteLine($"[Reçu brut de {(client.Client.RemoteEndPoint as IPEndPoint)?.Address}] : {receivedMessage}");
                var matches = Regex.Matches(receivedMessage, @"%.*?\?");
                foreach (Match match in matches)
                {
                    string trame = match.Value;

                    var dateMatch = Regex.Match(trame, @"\d{2}/\d{2}/\d{2}");
                    var timeMatch = Regex.Match(trame, @"\d{2}:\d{2}:\d{2}");
                    string serialNumber = trame.Substring(0, dateMatch.Index);
                    Console.WriteLine($"SerialNumber: {serialNumber}");
                    if (!dateMatch.Success || !timeMatch.Success)
                    {
                        Console.WriteLine($"[Trame ignorée] Format date/heure invalide : {trame}");
                        continue;
                    }
                    string rawDate = dateMatch.Value;
                    string rawTime = timeMatch.Value;

                    if (!DateTime.TryParseExact($"{rawDate} {rawTime}", "dd/MM/yy HH:mm:ss", null,
                        System.Globalization.DateTimeStyles.None, out DateTime datetime))
                    {
                        Console.WriteLine($"[Trame ignorée] Erreur conversion date/heure : {trame}");
                        continue;
                    }

                    int indexAfterTime = timeMatch.Index + timeMatch.Length;
                    int indexQuestion = trame.LastIndexOf('?');
                    string rawMatricule = trame.Substring(indexAfterTime, indexQuestion - indexAfterTime);
                    string cleanMatricule = new string(rawMatricule.Where(char.IsDigit).ToArray());
                    if (string.IsNullOrWhiteSpace(cleanMatricule))
                    {
                        Console.WriteLine($"[Trame ignorée] Matricule manquant : {trame}");
                        continue;
                    }
                    string isoDateTime = datetime.ToString("yyyy-MM-dd'T'HH:mm:ss");
                    Console.WriteLine($"Matricule: {cleanMatricule}, DateTime: {isoDateTime}");
                    await SendSoapAsync(httpClient, url, impersonation, cleanMatricule, isoDateTime, datetime);
                }
            }
        }
        static async Task SendSoapAsync(HttpClient httpClient, string url, string impersonation, string matricule, string isoDateTime, DateTime datetime)
        {
            string soapEnvelope = $@"<?xml version=""1.0"" encoding=""utf-8""?>
<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/"" 
                  xmlns:sf=""http://sf.hq.services.horoquartz.fr/"" 
                  xmlns:xsd=""http://www.horoquartz.fr/services/hq/sf/xsd"">
   <soapenv:Header>
      <sf:token>MON_TOKEN_ICI</sf:token>
   </soapenv:Header>
   <soapenv:Body>
      <sf:createGpsClock2>
         <gpsClockRequest>
            <xsd:matricule>{matricule}</xsd:matricule>
            <xsd:offlineMode>1</xsd:offlineMode>
            <xsd:date>{isoDateTime}</xsd:date>
            <xsd:activeGps>0</xsd:activeGps>
            <xsd:latitude>?</xsd:latitude>
            <xsd:longitude>?</xsd:longitude>
            <xsd:tolerance>?</xsd:tolerance>
            <xsd:options>
               <xsd:name>lecteur</xsd:name>
               <xsd:value>TNFA-PB009</xsd:value>
            </xsd:options>
         </gpsClockRequest>
      </sf:createGpsClock2>
   </soapenv:Body>
</soapenv:Envelope>";

            try
            {
                var content = new StringContent(soapEnvelope, Encoding.UTF8, "text/xml");
                content.Headers.Add("SOAPAction", "");

                var response = await httpClient.PostAsync(url, content);
                string result = await response.Content.ReadAsStringAsync();

                Console.WriteLine($"[SOAP OK] Matricule {matricule} à {isoDateTime}");
                File.AppendAllText(logFilePath,
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | OK | {matricule} | {isoDateTime}{Environment.NewLine}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SOAP FAIL] {matricule} : {ex.Message}");
                File.AppendAllText(logFilePath,
                    $"{DateTime.Now:yyyy-MM-dd HH:mm:ss} | ERREUR | {matricule} | {ex.Message}{Environment.NewLine}");

                LogFailedPointage(matricule, datetime, ex.Message);
            }
        }

        static void LogFailedPointage(string matricule, DateTime datetime, string message)
        {
            try
            {
                using (var connection = new SqlConnection(connectionString))
                {
                    connection.Open();
                    using (var command = new SqlCommand(
                        "INSERT INTO FailedPointages (Matricule, DatePointage, HeurePointage) VALUES (@Matricule, @DatePointage, @HeurePointage)", connection))
                    {
                        command.Parameters.AddWithValue("@Matricule", matricule);
                        command.Parameters.AddWithValue("@DatePointage", datetime.Date);       // stocke la date
                        command.Parameters.AddWithValue("@HeurePointage", datetime.TimeOfDay); // stocke l'heure
                        command.ExecuteNonQuery();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[SQL LOG FAIL] " + ex.Message);
            }
        }

        static async Task RetryFailedPointagesAsync(HttpClient httpClient, string url, string impersonation)
        {
            try
            {
                using var connection = new SqlConnection(connectionString);
                await connection.OpenAsync();

                using var command = new SqlCommand("SELECT Id, Matricule, DatePointage, HeurePointage FROM FailedPointages", connection);
                using var reader = await command.ExecuteReaderAsync();

                var list = new List<(int Id, string Matricule, DateTime Date, TimeSpan Heure)>();
                while (await reader.ReadAsync())
                {
                    list.Add((
                        reader.GetInt32(0),
                        reader.GetString(1),
                        reader.GetDateTime(2),
                        reader.GetTimeSpan(3)
                    ));
                }

                reader.Close();

                foreach (var item in list)
                {
                    try
                    {
                        DateTime retryDateTime = item.Date.Date + item.Heure; // reconstruit datetime complet
                        string isoDateTime = retryDateTime.ToString("yyyy-MM-dd'T'HH:mm:ss");

                        await SendSoapAsync(httpClient, url, impersonation, item.Matricule, isoDateTime, retryDateTime);

                        using var deleteCommand = new SqlCommand("DELETE FROM FailedPointages WHERE Id = @Id", connection);
                        deleteCommand.Parameters.AddWithValue("@Id", item.Id);
                        await deleteCommand.ExecuteNonQueryAsync();
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[RETRY FAIL] {item.Matricule} : {ex.Message}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine("[RETRY ERROR] " + ex.Message);
            }
        }

        static Dictionary<string, Dictionary<string, string>> ReadIni(string filePath)
        {
            var result = new Dictionary<string, Dictionary<string, string>>(StringComparer.OrdinalIgnoreCase);
            string currentSection = "";

            foreach (var line in File.ReadAllLines(filePath))
            {
                var trimmed = line.Trim();
                if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith(";") || trimmed.StartsWith("#")) continue;

                if (trimmed.StartsWith("[") && trimmed.EndsWith("]"))
                {
                    currentSection = trimmed.Substring(1, trimmed.Length - 2);
                    if (!result.ContainsKey(currentSection))
                        result[currentSection] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                }
                else if (trimmed.Contains('='))
                {
                    var parts = trimmed.Split('=', 2);
                    if (!result.ContainsKey(currentSection))
                        result[currentSection] = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                    result[currentSection][parts[0].Trim()] = parts[1].Trim();
                }
            }
            return result;
        }
    }
}
