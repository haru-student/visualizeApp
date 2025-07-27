using Newtonsoft.Json;
using System.Reflection;

namespace visualizeApp.Services
{
    public class JsonExporter
    {
        public List<Node> Nodes { get; private set; } = new List<Node>();
        public List<Link> Links { get; private set; } = new List<Link>();

        private readonly HashSet<string> methodLabels = new();

        public void addNode(int id, string type, string label, int depth, string className, string methodName, int lineNumber)
        {
            Console.WriteLine($"{id}, {label}");
            var node = new Node
            {
                Id = id,
                Type = type,
                Label = label,
                Depth = depth,
                Class = className,
                Method = methodName,
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
            // パッド図（ノードとリンク）を作成
            var padDiagram = new PadDiagram
            {
                Nodes = Nodes,
                Links = Links
            };

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "padDiagram.json");

            string json = JsonConvert.SerializeObject(padDiagram, new JsonSerializerSettings
            {
                Formatting = Formatting.Indented,
                NullValueHandling = NullValueHandling.Ignore
            });

            File.WriteAllText(filePath, json);
            Nodes.Clear();
            Links.Clear();

            CodeAnalysis.id = 0;
            CodeAnalysis.preId.Clear();
            CodeAnalysis.preType.Clear();
        }

        public void SaveCallGraph(
            List<(string ClassName, string MethodName)> methodList,
            List<(string source, string target)> linkCallGraph)
        {
            var nodes = new List<object>();
            int id = 0;
            var labelToId = new Dictionary<string, int>();

            // ノードのID割り当て
            foreach (var (cls, method) in methodList)
            {
                var label = $"{cls}.{method}";
                if (!labelToId.ContainsKey(label))
                {
                    labelToId[label] = id++;
                    nodes.Add(new { id = labelToId[label], label });
                }
            }

            // linkCallGraph の string から id へ変換
            var links = new List<object>();
            foreach (var (sourceLabel, targetLabel) in linkCallGraph)
            {
                if (labelToId.TryGetValue(sourceLabel, out int sourceId) &&
                    labelToId.TryGetValue(targetLabel, out int targetId))
                {
                    links.Add(new
                    {
                        source = sourceId,
                        target = targetId
                    });
                }
                else
                {
                    Console.WriteLine($"[警告] ID変換に失敗: {sourceLabel} -> {targetLabel}");
                }
            }

            // JSON オブジェクト作成
            var callGraph = new
            {
                nodes = nodes,
                links = links
            };

            var json = System.Text.Json.JsonSerializer.Serialize(callGraph, new System.Text.Json.JsonSerializerOptions
            {
                WriteIndented = true
            });

            var filePath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "callGraph.json");
            File.WriteAllText(filePath, json);
        }

    }
}