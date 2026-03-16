namespace Hysj.Client;

public partial class App : Application
{
    public App()
    {
        InitializeComponent();
        MainPage = new AppShell();
    }

    protected override Window CreateWindow(IActivationState? activationState)
    {
        var window = base.CreateWindow(activationState);

        // Navigate to language selection on first run, otherwise login
        window.Created += async (_, _) =>
        {
            bool langSelected = Preferences.Get("language_selected", false);
            string route = langSelected ? "//LoginPage" : "//LanguagePage";
            await Shell.Current.GoToAsync(route);
        };

        return window;
    }
}
