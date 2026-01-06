using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO;
using visualizeApp.Models;
using visualizeApp.Services;

namespace visualizeApp.Controllers
{
    public class TestController : Controller
    {
        private readonly LoggingService _logger;
        private readonly LogRepository _repo;

        public TestController(LoggingService logger, LogRepository repo)
        {
            _logger = logger;
            _repo = repo;
        }
        
        public IActionResult Index(string? testId=null)
        {
            ViewData["testId"] = testId;
            return View();
        }

        public IActionResult Code(string? testId=null)
        {
            ViewData["testId"] = testId;
            return View();
        }
        public IActionResult Diagram(string? testId=null)
        {
            ViewData["testId"] = testId;
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
