using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class SecurityPage : ContentPage
{
    public SecurityPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<SecurityViewModel>()) { }

    public SecurityPage(SecurityViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }

    protected override async void OnAppearing()
    {
        base.OnAppearing();
        if (BindingContext is SecurityViewModel vm)
            await vm.InitAsync();
    }
}
