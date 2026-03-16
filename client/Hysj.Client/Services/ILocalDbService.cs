using Hysj.Client.Models;
using Contact = Hysj.Client.Models.Contact;

namespace Hysj.Client.Services;

public interface ILocalDbService
{
    // Conversations
    Task<List<Conversation>> GetConversationsAsync();
    Task<Conversation?> GetConversationAsync(string id);
    Task UpsertConversationAsync(Conversation c);
    Task DeleteConversationAsync(string id);

    // Messages
    Task<List<Message>> GetMessagesAsync(string conversationId);
    Task SaveMessageAsync(Message m);
    Task DeleteMessagesForConversationAsync(string conversationId);
    Task DeleteAllAsync();

    // Contacts
    Task<List<Contact>> GetContactsAsync();
    Task UpsertContactAsync(Contact c);
}
