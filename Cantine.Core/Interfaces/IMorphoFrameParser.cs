using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IMorphoFrameParser
{
    IEnumerable<MorphoFrame> ParseFrames(string raw);
}
