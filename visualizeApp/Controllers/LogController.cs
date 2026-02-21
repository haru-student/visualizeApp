using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.IO;
using visualizeApp.Models;
using visualizeApp.Services;

namespace visualizeApp.Controllers
{
    [ApiController]
    [Route("[controller]/[action]")]
    public class LogController : Controller
    {
        private readonly LogRepository _repo;

        public LogController(LogRepository repo)
        {
            _repo = repo;
        }

        [HttpPost]
        public async Task<IActionResult> SaveLogData([FromBody] LogRequestDto dto)
        {
            try
            {
                var log = new LogData
                {
                    id = Guid.NewGuid().ToString(),
                    uniqueId = dto.uniqueId,
                    userId = dto.userId,
                    testId = dto.testId,
                    testType = dto.testType,
                    eventType = dto.eventType,
                    location = dto.location,
                    detail = dto.detail,
                    timestamp = dto.timestamp
                };

                await _repo.InsertAsync(log);

                return Ok();
            }
            catch (Exception ex)
            {
                Console.WriteLine("SaveLogData ERROR");
                Console.WriteLine(ex.ToString());
                return StatusCode(500, ex.Message);
            }
        }

    }
}
