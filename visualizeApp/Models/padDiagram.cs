public class Node
{
    public required int Id { get; set; }
    public required string Type { get; set; }
    public required string Label { get; set; }
    public string? Class { get; set; }
    public string? Method { get; set; }
    public required int Depth { get; set; }
    public int LineNumber { get; set; }
}

public class Link
{
    public required int Node1 { get; set; }
    public required int Node2 { get; set; }
    public required string Type { get; set; }
    public required string Class { get; set; }
    public required string Method { get; set; }
}


public class PadDiagram
{
    public required List<Node> Nodes { get; set; }
    public required List<Link> Links { get; set; }
}
