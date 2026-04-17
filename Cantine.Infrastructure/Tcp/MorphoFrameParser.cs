using System.Globalization;
using System.Text.RegularExpressions;
using Cantine.Core.DTOs;
using Cantine.Core.Enums;
using Cantine.Core.Interfaces;
using Microsoft.Extensions.Logging;

namespace Cantine.Infrastructure.Tcp;

public class MorphoFrameParser : IMorphoFrameParser
{
    private static readonly Regex FrameRegex = new(@"%?[^\r\n]*[?IO]", RegexOptions.Compiled);
    private static readonly Regex DateRegex = new(@"\d{2}/\d{2}/\d{2}", RegexOptions.Compiled);
    private static readonly Regex TimeRegex = new(@"\d{2}:\d{2}:\d{2}", RegexOptions.Compiled);

    private readonly ILogger<MorphoFrameParser> _logger;

    public MorphoFrameParser(ILogger<MorphoFrameParser> logger)
    {
        _logger = logger;
    }

    public IEnumerable<MorphoFrame> ParseFrames(string raw)
    {
        var matches = FrameRegex.Matches(raw);

        foreach (Match match in matches)
        {
            var frame = TryParse(match.Value);
            if (frame is not null)
                yield return frame;
        }
    }

    private MorphoFrame? TryParse(string trame)
    {
        _logger.LogInformation("[Parser] Trame brute : [{Trame}]", trame);
        var dateMatch = DateRegex.Match(trame);
        var timeMatch = TimeRegex.Match(trame);

        if (!dateMatch.Success || !timeMatch.Success)
        {
            _logger.LogWarning("[Parser] Trame ignorée — format date/heure invalide : {Trame}", trame);
            return null;
        }

        if (!DateTime.TryParseExact(
            $"{dateMatch.Value} {timeMatch.Value}",
            "dd/MM/yy HH:mm:ss",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var timestamp))
        {
            _logger.LogWarning("[Parser] Trame ignorée — erreur conversion date/heure : {Trame}", trame);
            return null;
        }

        // Numéro de série = tout ce qui précède la date
        string serialNumber = trame[..dateMatch.Index];

        // Dernier caractère de la trame = bouton (O, I) ou terminateur par défaut (?)
        char buttonChar = trame[^1];

        // Zone entre fin de l'heure et le bouton final : <MATRICULE>
        int indexAfterTime = timeMatch.Index + timeMatch.Length;
        string rawSuffix = trame[indexAfterTime..^1];

        string cleanMatricule = new(rawSuffix.Where(char.IsDigit).ToArray());

        if (string.IsNullOrWhiteSpace(cleanMatricule))
        {
            _logger.LogWarning("[Parser] Trame ignorée — matricule manquant : {Trame}", trame);
            return null;
        }

        var repasType = buttonChar switch
        {
            'O' => RepasType.PlatChaud,
            'I' => RepasType.Sandwich,
            _ => RepasType.PlatChaud // défaut si bouton inconnu
        };

        if (buttonChar != 'O' && buttonChar != 'I')
            _logger.LogWarning("[Parser] Bouton inconnu '{Button}' dans la trame — PlatChaud par défaut", buttonChar);

        return new MorphoFrame
        {
            Matricule = cleanMatricule,
            Timestamp = timestamp,
            RepasType = repasType,
            SerialNumber = serialNumber
        };
    }
}
