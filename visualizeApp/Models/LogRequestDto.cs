using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Generic;
public class LogRequestDto
{
    public required string userId { get; set; }
    public required string testId { get; set; }
    public required string testType { get; set; }
    public required string eventType { get; set; }
    public LocationInfo? location { get; set; }
    public Dictionary<string, string>? detail { get; set; }
    public required string timestamp { get; set; }
}
public class LocationInfo
{
    public required string Class { get; set; }
    public required string Method { get; set; }
    public int? NodeId { get; set; }
}
