using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class RegisterPage : ContentPage
{
    public RegisterPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<RegisterViewModel>()) { }

    public RegisterPage(RegisterViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
