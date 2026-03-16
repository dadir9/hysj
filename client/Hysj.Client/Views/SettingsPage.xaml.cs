using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class SettingsPage : ContentPage
{
    public SettingsPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<SettingsViewModel>()) { }

    public SettingsPage(SettingsViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
