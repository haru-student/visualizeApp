using visualizeApp.Models;

namespace visualizeApp.Services
{
    public class LoggingService
    {
        private readonly LogRepository _repo;

        public LoggingService(LogRepository repo)
        {
            _repo = repo;
        }

        public async Task ExecuteAsync(LogRequestDto data)
        {
            var log = CreateLogEntity(data);
            await _repo.InsertAsync(log);
        }

        public LogData CreateLogEntity(LogRequestDto data)
        {
            return new LogData
            {
                id = Guid.NewGuid().ToString(),
                uniqueId = data.uniqueId,
                userId = data.userId,
                testId = data.testId,
                testType = data.testType,
                eventType = data.eventType,
                location = data.location,
                detail = data.detail,
                timestamp = data.timestamp
            };
        }
    }
}
