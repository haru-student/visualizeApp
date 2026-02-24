using Microsoft.Azure.Cosmos;

public class LogRepository
{
    private readonly Container? _container;
    private readonly string? _configurationError;

    public LogRepository(CosmosClient? client, IConfiguration config)
    {
        if (client == null)
        {
            _configurationError = "CosmosClient is not configured.";
            return;
        }

        var dbEnv = Environment.GetEnvironmentVariable("COSMOS_DATABASE");
        var containerEnv = Environment.GetEnvironmentVariable("COSMOS_CONTAINER");
        var db = string.IsNullOrWhiteSpace(dbEnv) ? config["Cosmos:Database"] : dbEnv;
        var container = string.IsNullOrWhiteSpace(containerEnv) ? config["Cosmos:Container"] : containerEnv;

        if (string.IsNullOrWhiteSpace(db) || string.IsNullOrWhiteSpace(container))
        {
            _configurationError =
                "Cosmos Database/Container is not configured. Set COSMOS_DATABASE and COSMOS_CONTAINER (or Cosmos:Database / Cosmos:Container).";
            return;
        }

        _container = client.GetDatabase(db).GetContainer(container);
    }

    public async Task InsertAsync(LogData log)
    {
        if (_container == null)
        {
            throw new InvalidOperationException(_configurationError ?? "Cosmos container is not available.");
        }

        await _container.CreateItemAsync(log, new PartitionKey(log.testId));
    }
}
