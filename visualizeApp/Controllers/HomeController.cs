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
        private readonly CodeAnalysis _roslyn;

        public HomeController(CodeAnalysis roslyn)
        {
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

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
