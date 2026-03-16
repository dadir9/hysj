using Hysj.Client.Models;
using Contact = Hysj.Client.Models.Contact;
using SQLite;

namespace Hysj.Client.Services;

public class LocalDbService : ILocalDbService
{
    private SQLiteAsyncConnection? _db;

    private async Task<SQLiteAsyncConnection> GetDbAsync()
    {
        if (_db is not null) return _db;
        var path = Path.Combine(FileSystem.AppDataDirectory, "hysj.db3");
        _db = new SQLiteAsyncConnection(path,
            SQLiteOpenFlags.ReadWrite | SQLiteOpenFlags.Create | SQLiteOpenFlags.SharedCache);
        await _db.CreateTableAsync<Conversation>();
        await _db.CreateTableAsync<Message>();
        await _db.CreateTableAsync<Contact>();
        return _db;
    }

    // ── Conversations ───────────────────────────────────────────────
    public async Task<List<Conversation>> GetConversationsAsync()
    {
        var db = await GetDbAsync();
        return await db.Table<Conversation>()
            .Where(c => !c.IsDeleted)
            .OrderByDescending(c => c.LastMessageAt)
            .ToListAsync();
    }

    public async Task<Conversation?> GetConversationAsync(string id)
    {
        var db = await GetDbAsync();
        return await db.Table<Conversation>().Where(c => c.Id == id).FirstOrDefaultAsync();
    }

    public async Task UpsertConversationAsync(Conversation c)
    {
        var db = await GetDbAsync();
        await db.InsertOrReplaceAsync(c);
    }

    public async Task DeleteConversationAsync(string id)
    {
        var db = await GetDbAsync();
        await db.ExecuteAsync("UPDATE conversations SET IsDeleted=1 WHERE Id=?", id);
    }

    // ── Messages ────────────────────────────────────────────────────
    public async Task<List<Message>> GetMessagesAsync(string conversationId)
    {
        var db = await GetDbAsync();
        return await db.Table<Message>()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .ToListAsync();
    }

    public async Task SaveMessageAsync(Message m)
    {
        var db = await GetDbAsync();
        await db.InsertOrReplaceAsync(m);
    }

    public async Task DeleteMessagesForConversationAsync(string conversationId)
    {
        var db = await GetDbAsync();
        await db.ExecuteAsync("DELETE FROM messages WHERE ConversationId=?", conversationId);
    }

    public async Task DeleteAllAsync()
    {
        var db = await GetDbAsync();
        await db.DeleteAllAsync<Message>();
        await db.DeleteAllAsync<Conversation>();
        await db.DeleteAllAsync<Contact>();
    }

    // ── Contacts ────────────────────────────────────────────────────
    public async Task<List<Contact>> GetContactsAsync()
    {
        var db = await GetDbAsync();
        return await db.Table<Contact>().Where(c => !c.IsBlocked).ToListAsync();
    }

    public async Task UpsertContactAsync(Contact c)
    {
        var db = await GetDbAsync();
        await db.InsertOrReplaceAsync(c);
    }
}
