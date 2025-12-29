using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO;
using visualizeApp.Models;
using visualizeApp.Services;

namespace visualizeApp.Controllers
{
    public class HomeController : Controller
    {
        private readonly LoggingService _logger;
        private readonly CodeAnalysis _roslyn;

        public HomeController(LoggingService logger, CodeAnalysis roslyn)
        {
            _logger = logger;
            _roslyn = roslyn;
        }
        
        public IActionResult Index()
        {
            var padFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "padDiagram.json");
            var callGraphFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "callGraph.json");

            var dir = Path.GetDirectoryName(padFile);
            if (!Directory.Exists(dir) && dir != null)
            {
                Directory.CreateDirectory(dir);
            }

            dir = Path.GetDirectoryName(callGraphFile);
            if (!Directory.Exists(dir) && dir != null)
            {
                Directory.CreateDirectory(dir);
            }

            System.IO.File.WriteAllText(padFile, "null");
            System.IO.File.WriteAllText(callGraphFile, "null");

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

        [HttpPost]
        public IActionResult SaveLogData([FromBody] LogData data)
        {
            if (data == null)
            {
                return BadRequest("Invalid data: Request body is empty or malformed.");
            }
            _logger.appendLogData(data);

            return Ok();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
