using CommunityToolkit.Maui;
using Hysj.Client.Resources.Localization;
using Hysj.Client.Services;
using Hysj.Client.ViewModels;
using Hysj.Client.Views;
using Microsoft.Extensions.Logging;

namespace Hysj.Client;

public static class MauiProgram
{
    public static MauiApp CreateMauiApp()
    {
        var builder = MauiApp.CreateBuilder();
        builder
            .UseMauiApp<App>()
            .UseMauiCommunityToolkit()
            .ConfigureFonts(fonts =>
            {
                fonts.AddFont("OpenSans-Regular.ttf",  "OpenSansRegular");
                fonts.AddFont("OpenSans-Semibold.ttf", "OpenSansSemibold");
            });

        // Services
        builder.Services.AddSingleton<ILocalizationService, LocalizationService>();

        // ViewModels
        builder.Services.AddTransient<LanguageSelectionViewModel>();

        // Pages
        builder.Services.AddTransient<LanguageSelectionPage>();

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
