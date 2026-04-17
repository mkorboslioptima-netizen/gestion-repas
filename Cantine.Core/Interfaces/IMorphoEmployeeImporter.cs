using Cantine.Core.DTOs;

namespace Cantine.Core.Interfaces;

public interface IMorphoEmployeeImporter
{
    Task<ImportResultDto> ImportAsync(string siteId, bool desactiverAbsents = false, string source = "Manual");
}
