using System.Collections.Concurrent;

namespace visualizeApp.Services
{
    public class VisualizationSnapshot
    {
        public required string ResultId { get; set; }
        public PadDiagram? PadDiagram { get; set; }
        public CallGraphData? CallGraph { get; set; }
    }

    public class VisualizationResultStore
    {
        private readonly ConcurrentDictionary<string, VisualizationSnapshot> _results = new();

        public string Save(PadDiagram? padDiagram, CallGraphData? callGraph)
        {
            var resultId = Guid.NewGuid().ToString("N");
            _results[resultId] = new VisualizationSnapshot
            {
                ResultId = resultId,
                PadDiagram = padDiagram,
                CallGraph = callGraph
            };

            if (_results.Count > 200)
            {
                var removeCount = _results.Count - 200;
                foreach (var key in _results.Keys.Take(removeCount))
                {
                    _results.TryRemove(key, out _);
                }
            }

            return resultId;
        }

        public VisualizationSnapshot? Get(string resultId)
        {
            if (string.IsNullOrWhiteSpace(resultId))
            {
                return null;
            }

            return _results.TryGetValue(resultId, out var result) ? result : null;
        }
    }
}
