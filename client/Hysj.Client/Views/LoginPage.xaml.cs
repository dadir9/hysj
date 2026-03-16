using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class LoginPage : ContentPage
{
    public LoginPage() : this(IPlatformApplication.Current!.Services.GetRequiredService<LoginViewModel>()) { }

    public LoginPage(LoginViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
