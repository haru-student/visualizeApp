using Microsoft.Azure.Cosmos;
public class LogRepository
{
    private readonly Container _container;

    public LogRepository(CosmosClient client, IConfiguration config)
    {
        _container = client
            .GetDatabase(config["Cosmos:Database"])
            .GetContainer(config["Cosmos:Container"]);
    }

    public async Task InsertAsync(LogData log)
    {
        await _container.CreateItemAsync(
            log,
            new PartitionKey(log.testId)
        );
    }
}
