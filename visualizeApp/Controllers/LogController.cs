using Microsoft.AspNetCore.Mvc;
using visualizeApp.Models;
using visualizeApp.Services;

namespace visualizeApp.Controllers
{
    [ApiController]
    [Route("[controller]/[action]")]
    public class LogController : Controller
    {
        private readonly LoggingService _loggingService;

        public LogController(LoggingService loggingService)
        {
            _loggingService = loggingService;
        }

        [HttpPost]
        public async Task<IActionResult> SaveLogData([FromBody] LogRequestDto dto)
        {
            try
            {
                await _loggingService.ExecuteAsync(dto);
                return Ok();
            }
            catch (InvalidOperationException ex)
            {
                return Problem(statusCode: 503, title: "Log storage is not configured.", detail: ex.Message);
            }
            catch (Exception)
            {
                return Problem(statusCode: 500, title: "Failed to save log data.");
            }
        }
    }
}
