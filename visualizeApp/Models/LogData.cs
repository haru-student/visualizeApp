using System.Text.Json;
public class LogData
{
    public required string UserId { get; set; }
    public required string EventType { get; set; }
    public LocationInfo? Location { get; set; }
    public JsonElement? Detail { get; set; }
    public required string Timestamp { get; set; }
}

public class LocationInfo
{
    public required string Class { get; set; }
    public required string Method { get; set; }
    public int? NodeId { get; set; }
}
