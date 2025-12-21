using visualizeApp.Services;

var builder = WebApplication.CreateBuilder(args);

// // 本番環境時に実行
builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(5000); // HTTPで全PCからアクセス可能
});

// Add services to the container.
builder.Services.AddControllersWithViews();

builder.Services.AddSingleton<LoggingService>();
builder.Services.AddSingleton<CodeAnalysis>();

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

// app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
