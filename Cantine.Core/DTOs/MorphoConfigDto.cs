namespace Cantine.Core.DTOs;

public class MorphoConfigDto
{
    public string SiteId { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public int CommandTimeout { get; set; } = 30;
}
