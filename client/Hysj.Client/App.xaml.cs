using Hysj.Client.Services;

namespace Hysj.Client;

public partial class App : Application
{
    public App(IAuthStateService auth)
    {
        InitializeComponent();
        ((AuthStateService)auth).LoadFromPreferences();
        MainPage = new AppShell();
    }

    protected override async void OnStart()
    {
        base.OnStart();
        await Task.Delay(100);

        if (!Preferences.Get("language_selected", false))
            await Shell.Current.GoToAsync("//LanguagePage");
        else if (!IPlatformApplication.Current!.Services
                     .GetRequiredService<IAuthStateService>().IsAuthenticated)
            await Shell.Current.GoToAsync("//LoginPage");
        else
            await Shell.Current.GoToAsync("//ConversationListPage");
    }
}
