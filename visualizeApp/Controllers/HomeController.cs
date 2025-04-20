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
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }
        
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public async Task<IActionResult> ProcessFile(IFormFile csFile)
        {
            if (csFile == null || csFile.Length == 0)
            {
                ModelState.AddModelError("", "Please upload a valid C# file.");
                return View("Index");
            }

            string fileContent;
            using (var reader = new StreamReader(csFile.OpenReadStream()))
            {
                fileContent = await reader.ReadToEndAsync();
            }
            CodeAnalysis roslyn = new CodeAnalysis();
            roslyn.Entry(fileContent);

            return View("Shapes");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
