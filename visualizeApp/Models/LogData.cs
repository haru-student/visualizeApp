using System.Text.Json;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Generic;

public class LogData
{
    public required string id { get; set; }
    public required string userId { get; set; }
    public required string testId { get; set; }
    public required string testType { get; set; }
    public required string eventType { get; set; }
    public LocationInfo? location { get; set; }
    public Dictionary<string, string>? detail { get; set; }
    public required string timestamp { get; set; }
}
