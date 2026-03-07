namespace visualizeApp.Services
{
    public class CallGraphData
    {
        public required List<CallGraphNode> Nodes { get; set; }
        public required List<CallGraphLink> Links { get; set; }
    }

    public class CallGraphNode
    {
        public required int Id { get; set; }
        public required string Label { get; set; }
        public required string Parameters { get; set; }
    }

    public class CallGraphLink
    {
        public required int Source { get; set; }
        public required int Target { get; set; }
    }

    public class JsonExporter
    {
        public List<Node> Nodes { get; private set; } = new List<Node>();
        public List<Link> Links { get; private set; } = new List<Link>();
        public PadDiagram? CurrentPadDiagram { get; private set; }
        public CallGraphData? CurrentCallGraph { get; private set; }

        public void addNode(int id, string type, string label, int depth, string className, string methodName, int lineNumber, string? calledClass = null, string? calledMethod = null, string? arguments = null)
        {
            var node = new Node
            {
                Id = id,
                Type = type,
                Label = label,
                Depth = depth,
                Class = className,
                Method = methodName,
                CalledClass = calledClass,
                CalledMethod = calledMethod,
                Arguments = arguments,
                LineNumber = lineNumber
            };
            Nodes.Add(node);
        }

        public void AddLink(int sourceId, int targetId, string type, string className, string methodName)
        {
            var link = new Link
            {
                Node1 = sourceId,
                Node2 = targetId,
                Type = type,
                Class = className,
                Method = methodName
            };
            Links.Add(link);
        }

        public void saveFile()
        {
            CurrentPadDiagram = new PadDiagram
            {
                Nodes = Nodes.Select(n => new Node
                {
                    Id = n.Id,
                    Type = n.Type,
                    Label = n.Label,
                    Depth = n.Depth,
                    Class = n.Class,
                    Method = n.Method,
                    CalledClass = n.CalledClass,
                    CalledMethod = n.CalledMethod,
                    Arguments = n.Arguments,
                    LineNumber = n.LineNumber
                }).ToList(),
                Links = Links.Select(l => new Link
                {
                    Node1 = l.Node1,
                    Node2 = l.Node2,
                    Type = l.Type,
                    Class = l.Class,
                    Method = l.Method
                }).ToList()
            };

            Nodes.Clear();
            Links.Clear();

            CodeAnalysis.id = 0;
            CodeAnalysis.preId.Clear();
            CodeAnalysis.preType.Clear();
        }

        public void SaveCallGraph(
            List<(string ClassName, string MethodName, string Parameters)> methodList,
            List<(string source, string target)> linkCallGraph)
        {
            var nodes = new List<CallGraphNode>();
            int id = 0;
            var labelToId = new Dictionary<string, int>();

            foreach (var (cls, method, param) in methodList)
            {
                var label = $"{cls}.{method}";
                if (!labelToId.ContainsKey(label))
                {
                    labelToId[label] = id++;
                    nodes.Add(new CallGraphNode
                    {
                        Id = labelToId[label],
                        Label = label,
                        Parameters = param
                    });
                }
            }

            var links = new List<CallGraphLink>();
            foreach (var (sourceLabel, targetLabel) in linkCallGraph)
            {
                if (labelToId.TryGetValue(sourceLabel, out int sourceId) &&
                    labelToId.TryGetValue(targetLabel, out int targetId))
                {
                    links.Add(new CallGraphLink
                    {
                        Source = sourceId,
                        Target = targetId
                    });
                }
                else
                {
                    Console.WriteLine($"[警告] ID変換に失敗: {sourceLabel} -> {targetLabel}");
                }
            }

            CurrentCallGraph = new CallGraphData
            {
                Nodes = nodes,
                Links = links
            };
        }

        public void ClearCurrentData()
        {
            CurrentPadDiagram = null;
            CurrentCallGraph = null;
        }
    }
}
