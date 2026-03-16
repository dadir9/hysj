using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class ChatPage : ContentPage
{
    public ChatPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<ChatViewModel>()) { }

    public ChatPage(ChatViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
