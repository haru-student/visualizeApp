using visualizeApp.Services;
using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);
builder.Configuration.AddEnvironmentVariables();

// MVC + API 両対応
builder.Services.AddControllersWithViews();
builder.Services.AddControllers(); 

builder.Services.AddSingleton<LogRepository>();
builder.Services.AddSingleton<CodeAnalysis>();

builder.Services.AddSingleton<CosmosClient>(s =>
{
    var endpoint = Environment.GetEnvironmentVariable("COSMOS_ENDPOINT");
    var key = Environment.GetEnvironmentVariable("COSMOS_KEY");

    if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(key))
    {
        // 起動は止めない（ログだけ）
        Console.WriteLine("⚠ Cosmos env not set");
        return null!;
    }

    return new CosmosClient(endpoint, key);
});


var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();
app.UseAuthorization();

// ★ API を有効化（これが無かった）
app.MapControllers();

// ★ MVC View
app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
