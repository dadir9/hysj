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

        // ── Services ────────────────────────────────────────────────
        builder.Services.AddSingleton<ILocalizationService, LocalizationService>();
        builder.Services.AddSingleton<IAuthStateService,    AuthStateService>();
        builder.Services.AddSingleton<ILocalDbService,      LocalDbService>();
        builder.Services.AddSingleton<IChatService,         ChatService>();
        builder.Services.AddSingleton<IKeyManager,          KeyManager>();
        builder.Services.AddSingleton<IApiService,          ApiService>();
        builder.Services.AddSingleton<ICryptoService,       CryptoService>();
        builder.Services.AddSingleton<IWipeService,         WipeService>();

        // ── ViewModels ───────────────────────────────────────────────
        builder.Services.AddTransient<LanguageSelectionViewModel>();
        builder.Services.AddTransient<LoginViewModel>();
        builder.Services.AddTransient<RegisterViewModel>();
        builder.Services.AddTransient<ConversationListViewModel>();
        builder.Services.AddTransient<ChatViewModel>();
        builder.Services.AddTransient<CreateGroupViewModel>();
        builder.Services.AddTransient<SecurityViewModel>();
        builder.Services.AddTransient<SettingsViewModel>();

        // ── Pages ────────────────────────────────────────────────────
        builder.Services.AddTransient<LanguageSelectionPage>();
        builder.Services.AddTransient<LoginPage>();
        builder.Services.AddTransient<RegisterPage>();
        builder.Services.AddTransient<ConversationListPage>();
        builder.Services.AddTransient<ChatPage>();
        builder.Services.AddTransient<CreateGroupPage>();
        builder.Services.AddTransient<SecurityPage>();
        builder.Services.AddTransient<SettingsPage>();

        // ── Register Shell routes ────────────────────────────────────
        Routing.RegisterRoute("ChatPage",        typeof(ChatPage));
        Routing.RegisterRoute("CreateGroupPage", typeof(CreateGroupPage));
        Routing.RegisterRoute("SecurityPage",    typeof(SecurityPage));
        Routing.RegisterRoute("SettingsPage",    typeof(SettingsPage));

#if DEBUG
        builder.Logging.AddDebug();
#endif

        return builder.Build();
    }
}
