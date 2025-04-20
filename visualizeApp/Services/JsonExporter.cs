using Newtonsoft.Json;
using System.Reflection;

namespace visualizeApp.Services
{
    public class JsonExporter
    {
        public List<Node> Nodes { get; private set; } = new List<Node>();
        public List<Link> Links { get; private set; } = new List<Link>();

        public void addNode(int id, string type, string label, int depth, string className, string methodName, int lineNumber)
        {
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

        public void AddLink(int sourceId, int targetId, string type)
        {
            var link = new Link
            {
                Node1 = sourceId,
                Node2 = targetId, 
                Type = type
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
    }
}