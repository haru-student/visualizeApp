using System.Text.Json;
using visualizeApp.Models;
using Microsoft.AspNetCore.Hosting;
using System.IO;
using System.Text.Encodings.Web;
using System.Text.Unicode;

namespace visualizeApp.Services
{
    public class LoggingService
    {
        private readonly string _logFilePath;

        public LoggingService(IWebHostEnvironment env)
        {
            // プロジェクトのルートに Logs フォルダを作成
            var logDir = Path.Combine(env.ContentRootPath, "Logs");

            if (!Directory.Exists(logDir))
            {
                Directory.CreateDirectory(logDir);
            }

            // 絶対パス
            _logFilePath = Path.Combine(logDir, "operation-log.jsonl");
        }
        public void appendLogData(LogData data)
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = false, 
                
                Encoder = JavaScriptEncoder.Create(UnicodeRanges.All) 
            };
            string json = JsonSerializer.Serialize(data, options);
            File.AppendAllText(_logFilePath, json + Environment.NewLine);
        }
    }
}