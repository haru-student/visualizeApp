using visualizeApp.Services;
using Microsoft.Azure.Cosmos;
using System.Text;

LoadEnvFileIfExists(
    Path.Combine(Directory.GetCurrentDirectory(), ".env")
);
var builder = WebApplication.CreateBuilder(args);

builder.Configuration
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(optional: true);

builder.Services.AddControllersWithViews();
builder.Services.AddControllers(); 
builder.Services.AddDistributedMemoryCache();
builder.Services.AddSession(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.IdleTimeout = TimeSpan.FromMinutes(30);
});

builder.Services.AddSingleton<LogRepository>();
builder.Services.AddSingleton<CodeAnalysis>();
builder.Services.AddSingleton<LoggingService>();
builder.Services.AddSingleton<VisualizationResultStore>();

builder.Services.AddSingleton<CosmosClient>(s =>
{
    var config = s.GetRequiredService<IConfiguration>();
    var endpointEnv = Environment.GetEnvironmentVariable("COSMOS_ENDPOINT");
    var keyEnv = Environment.GetEnvironmentVariable("COSMOS_KEY");
    var endpoint = string.IsNullOrWhiteSpace(endpointEnv)
        ? config["Cosmos:Endpoint"]
        : endpointEnv;
    var key = string.IsNullOrWhiteSpace(keyEnv)
        ? config["Cosmos:Key"]
        : keyEnv;

    if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(key))
    {
        // 起動は止めない（ログだけ）
        Console.WriteLine("⚠ Cosmos connection info not set. Set COSMOS_ENDPOINT/COSMOS_KEY via .env, environment variables, or Cosmos:Endpoint/Cosmos:Key (User Secrets).");
        return null!;
    }

    return new CosmosClient(endpoint, key);
});


var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseSession();
app.UseAuthorization();

app.MapControllers();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();

static void LoadEnvFileIfExists(string filePath)
{
    if (!File.Exists(filePath))
    {
        return;
    }

    foreach (var rawLine in File.ReadAllLines(filePath, Encoding.UTF8))
    {
        var line = rawLine.Trim();

        if (string.IsNullOrWhiteSpace(line) || line.StartsWith('#'))
        {
            continue;
        }

        var separator = line.IndexOf('=');
        if (separator <= 0)
        {
            continue;
        }

        var key = line[..separator].Trim();
        var value = line[(separator + 1)..].Trim().Trim('"');

        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
        {
            Environment.SetEnvironmentVariable(key, value);
        }
    }
}
