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

        public HomeController(CodeAnalysis roslyn)
        {
            _roslyn = roslyn;
        }

        public IActionResult Index()
        {
            _roslyn.ClearCurrentData();
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
                return Content("");
            }

            string fileContent;
            using (var reader = new StreamReader(csFile.OpenReadStream()))
            {
                fileContent = await reader.ReadToEndAsync();
            }

            _roslyn.Entry(fileContent);

            return Content("");
        }

        [HttpGet("api/visualize/call-graph")]
        public IActionResult GetCallGraph()
        {
            if (_roslyn.CurrentCallGraph == null)
            {
                return Json(null);
            }

            var response = new
            {
                nodes = _roslyn.CurrentCallGraph.Nodes.Select(x => new
                {
                    id = x.Id,
                    label = x.Label,
                    parameters = x.Parameters
                }),
                links = _roslyn.CurrentCallGraph.Links.Select(x => new
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
        public IActionResult GetPadDiagram()
        {
            if (_roslyn.CurrentPadDiagram == null)
            {
                return Json(null);
            }

            return Content(
                JsonConvert.SerializeObject(_roslyn.CurrentPadDiagram),
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
