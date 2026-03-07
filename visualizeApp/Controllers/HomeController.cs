using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json;
using System.Diagnostics;
using System.IO;
using System.Text;
using visualizeApp.Models;
using visualizeApp.Services;

namespace visualizeApp.Controllers
{
    public class HomeController : Controller
    {
        private readonly CodeAnalysis _roslyn;
        private readonly VisualizationResultStore _resultStore;

        public HomeController(CodeAnalysis roslyn, VisualizationResultStore resultStore)
        {
            _roslyn = roslyn;
            _resultStore = resultStore;
        }

        public IActionResult Index()
        {
            return View();
        }

        public IActionResult Test()
        {
            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ProcessFile(IFormFile csFile)
        {
            if (csFile == null || csFile.Length == 0)
            {
                return Json(new { resultId = string.Empty });
            }

            string fileContent;
            using (var reader = new StreamReader(csFile.OpenReadStream()))
            {
                fileContent = await reader.ReadToEndAsync();
            }

            var snapshot = _roslyn.AnalyzeSnapshot(fileContent);
            var resultId = _resultStore.Save(snapshot.PadDiagram, snapshot.CallGraph);

            return Json(new { resultId });
        }

        [HttpGet("api/visualize/call-graph")]
        public IActionResult GetCallGraph([FromQuery] string resultId)
        {
            var result = _resultStore.Get(resultId);
            if (result?.CallGraph == null)
            {
                return Json(null);
            }

            var response = new
            {
                nodes = result.CallGraph.Nodes.Select(x => new
                {
                    id = x.Id,
                    label = x.Label,
                    parameters = x.Parameters
                }),
                links = result.CallGraph.Links.Select(x => new
                {
                    source = x.Source,
                    target = x.Target
                })
            };

            return Content(
                System.Text.Json.JsonSerializer.Serialize(response),
                Encoding.UTF8,
                "application/json");
        }

        [HttpGet("api/visualize/pad-diagram")]
        public IActionResult GetPadDiagram([FromQuery] string resultId)
        {
            var result = _resultStore.Get(resultId);
            if (result?.PadDiagram == null)
            {
                return Json(null);
            }

            return Content(
                JsonConvert.SerializeObject(result.PadDiagram),
                Encoding.UTF8,
                "application/json");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
