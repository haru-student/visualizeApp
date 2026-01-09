using Microsoft.Azure.Cosmos;

public class LogRepository
{
    private readonly Container? _container;

    public LogRepository(CosmosClient? client, IConfiguration config)
    {
        if (client == null)
        {
            Console.WriteLine("⚠ CosmosClient is null. Logging disabled.");
            return;
        }

        var db = config["Cosmos:Database"];
        var container = config["Cosmos:Container"];

        if (string.IsNullOrEmpty(db) || string.IsNullOrEmpty(container))
        {
            Console.WriteLine("Cosmos Database/Container not configured.");
            return;
        }

        _container = client.GetDatabase(db).GetContainer(container);
    }

    public async Task InsertAsync(LogData log)
    {
        if (_container == null)
        {
            Console.WriteLine("⚠ Insert skipped (Cosmos not available)");
            return;
        }

        try
        {
            await _container.CreateItemAsync(
                log,
                new PartitionKey(log.testId)
            );
        }
        catch (Exception ex)
        {
            // 実験中は落とさない
            Console.WriteLine("Insert failed");
            Console.WriteLine(ex.ToString());
        }
    }
}
