if (document.getElementById('idForm')){
    document.getElementById('idForm').addEventListener('submit', function () {
    const value = document.getElementById('idInput').value;

    // Cookie保存（有効期限1日）
    document.cookie = `userId=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24}`;
    });
}