using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class ConversationListPage : ContentPage
{
    public ConversationListPage()
        : this(IPlatformApplication.Current!.Services.GetRequiredService<ConversationListViewModel>()) { }

    public ConversationListPage(ConversationListViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (BindingContext is ConversationListViewModel vm)
            await vm.InitAsync();
    }
}
