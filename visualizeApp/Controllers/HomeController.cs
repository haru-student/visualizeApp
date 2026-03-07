using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
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
        [AllowAnonymous]
        public async Task<IActionResult> ProcessFile(IFormFile csFile)
        {
            if (csFile == null || csFile.Length == 0)
            {
                return Json(new { success = false });
            }

            string fileContent;
            using (var reader = new StreamReader(csFile.OpenReadStream()))
            {
                fileContent = await reader.ReadToEndAsync();
            }

            var snapshot = _roslyn.AnalyzeSnapshot(fileContent);
            var resultId = _resultStore.Save(snapshot.PadDiagram, snapshot.CallGraph);
            HttpContext.Session.SetString("VisualizationResultId", resultId);

            return Json(new { success = true });
        }

        [HttpGet("api/visualize/call-graph")]
        public IActionResult GetCallGraph()
        {
            var resultId = HttpContext.Session.GetString("VisualizationResultId");
            var result = _resultStore.Get(resultId ?? string.Empty);
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
                "application/json",
                Encoding.UTF8);
        }

        [HttpGet("api/visualize/pad-diagram")]
        public IActionResult GetPadDiagram()
        {
            var resultId = HttpContext.Session.GetString("VisualizationResultId");
            var result = _resultStore.Get(resultId ?? string.Empty);
            if (result?.PadDiagram == null)
            {
                return Json(null);
            }

            return Content(
                JsonConvert.SerializeObject(result.PadDiagram),
                "application/json",
                Encoding.UTF8);
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
