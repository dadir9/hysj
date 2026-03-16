using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class CreateGroupPage : ContentPage
{
    public CreateGroupPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<CreateGroupViewModel>()) { }

    public CreateGroupPage(CreateGroupViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    private void OnAnonymousSelected(object sender, TappedEventArgs e)
    {
        if (BindingContext is CreateGroupViewModel vm)
            vm.IsAnonymous = true;
    }
}
