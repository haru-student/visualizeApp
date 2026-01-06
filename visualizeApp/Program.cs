using visualizeApp.Services;
using Microsoft.Azure.Cosmos;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddSingleton<LoggingService>();
builder.Services.AddSingleton<LogRepository>();
builder.Services.AddSingleton<CodeAnalysis>();

builder.Services.AddRouting(options =>
{
    options.LowercaseUrls = true;
    options.LowercaseQueryStrings = true;
});
builder.Services.AddSingleton(s =>
{
    var c = builder.Configuration.GetSection("Cosmos");
    return new CosmosClient(c["Endpoint"], c["Key"]);
});

var app = builder.Build();

app.UseStaticFiles();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // 開発時はキャッシュ無効にする
    app.UseStaticFiles(new StaticFileOptions
    {
        OnPrepareResponse = ctx =>
        {
            // 開発時はキャッシュ無効
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "-1";
        }
    });

    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
