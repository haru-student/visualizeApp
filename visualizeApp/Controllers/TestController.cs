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

        public TestController(LoggingService logger)
        {
            _logger = logger;
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
