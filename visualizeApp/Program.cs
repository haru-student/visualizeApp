using System.Security.Cryptography;
using System.Text;
using visualizeApp.Services;
using Microsoft.Azure.Cosmos;

LoadEncryptedEnvFileIfConfigured();
LoadEnvFileIfExists(Path.Combine(Directory.GetCurrentDirectory(), ".env"));

var builder = WebApplication.CreateBuilder(args);
builder.Configuration
    .AddEnvironmentVariables()
    .AddUserSecrets<Program>(optional: true);

// MVC + API 両対応
builder.Services.AddControllersWithViews();
builder.Services.AddControllers(); 

builder.Services.AddSingleton<LogRepository>();
builder.Services.AddSingleton<CodeAnalysis>();

builder.Services.AddSingleton<CosmosClient>(s =>
{
    var config = s.GetRequiredService<IConfiguration>();
    var endpoint = Environment.GetEnvironmentVariable("COSMOS_ENDPOINT")
        ?? config["Cosmos:Endpoint"];
    var key = Environment.GetEnvironmentVariable("COSMOS_KEY")
        ?? config["Cosmos:Key"];

    if (string.IsNullOrEmpty(endpoint) || string.IsNullOrEmpty(key))
    {
        // 起動は止めない（ログだけ）
        Console.WriteLine("⚠ Cosmos connection info not set. Set COSMOS_ENDPOINT/COSMOS_KEY via .env/.env.enc, environment variables, or Cosmos:Endpoint/Cosmos:Key (User Secrets).");
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

static void LoadEncryptedEnvFileIfConfigured()
{
    var encryptedPath = Path.Combine(Directory.GetCurrentDirectory(), ".env.enc");
    var passphrase = Environment.GetEnvironmentVariable("ENV_FILE_PASSPHRASE");

    if (!File.Exists(encryptedPath) || string.IsNullOrWhiteSpace(passphrase))
    {
        return;
    }

    try
    {
        var payload = Convert.FromBase64String(File.ReadAllText(encryptedPath, Encoding.UTF8));
        var plaintext = DecryptEnvPayload(payload, passphrase);

        foreach (var line in plaintext.Split('\n'))
        {
            var trimmed = line.Trim();
            if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
            {
                continue;
            }

            var separator = trimmed.IndexOf('=');
            if (separator <= 0)
            {
                continue;
            }

            var key = trimmed[..separator].Trim();
            var value = trimmed[(separator + 1)..].Trim().Trim('"');

            if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
            {
                Environment.SetEnvironmentVariable(key, value);
            }
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"⚠ .env.enc could not be decrypted: {ex.Message}");
    }
}

static string DecryptEnvPayload(byte[] payload, string passphrase)
{
    var opensslPrefix = Encoding.ASCII.GetBytes("Salted__");

    if (payload.Length <= 16 || !payload.Take(8).SequenceEqual(opensslPrefix))
    {
        throw new InvalidOperationException("Expected OpenSSL salted payload.");
    }

    var salt = payload[8..16];
    var cipher = payload[16..];

    using var kdf = new Rfc2898DeriveBytes(passphrase, salt, 10_000, HashAlgorithmName.SHA256);
    var keyIv = kdf.GetBytes(48);
    var key = keyIv[..32];
    var iv = keyIv[32..48];

    using var aes = Aes.Create();
    aes.Key = key;
    aes.IV = iv;
    aes.Mode = CipherMode.CBC;
    aes.Padding = PaddingMode.PKCS7;

    using var decryptor = aes.CreateDecryptor();
    var plaintextBytes = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
    return Encoding.UTF8.GetString(plaintextBytes);
}
