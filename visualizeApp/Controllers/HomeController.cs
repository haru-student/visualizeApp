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
            var padFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "padDiagram.json");
            var callGraphFile = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "data", "callGraph.json");

            // 親フォルダが無ければ作成
            var dir = Path.GetDirectoryName(padFile);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            dir = Path.GetDirectoryName(callGraphFile);
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }

            // ファイルの中身を "null" に初期化（なければ作成）
            System.IO.File.WriteAllText(padFile, "null");
            System.IO.File.WriteAllText(callGraphFile, "null");

            return View();
        }

        [HttpPost]
        public async Task<IActionResult> ProcessFile(IFormFile csFile)
        {
            if (csFile == null || csFile.Length == 0)
            {
                return Content("無効なファイルです。");
            }

            string fileContent;
            using (var reader = new StreamReader(csFile.OpenReadStream()))
            {
                fileContent = await reader.ReadToEndAsync();
            }

            CodeAnalysis roslyn = new CodeAnalysis();
            roslyn.Entry(fileContent);

            return Content("ファイルを正常に処理しました。");
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
