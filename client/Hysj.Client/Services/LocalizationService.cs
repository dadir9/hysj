using Hysj.Client.Resources.Localization;

namespace Hysj.Client.Services;

public class LocalizationService : ILocalizationService
{
    private const string LangKey = "app_language";
    private Dictionary<string, string> _strings = new();

    public string CurrentLanguage { get; private set; } = "en";

    public IReadOnlyList<LanguageOption> AvailableLanguages { get; } =
    [
        new("en", "English",    "English",    "🇬🇧"),
        new("no", "Norwegian",  "Norsk",      "🇳🇴"),
        new("es", "Spanish",    "Español",    "🇪🇸"),
        new("fr", "French",     "Français",   "🇫🇷"),
        new("de", "German",     "Deutsch",    "🇩🇪"),
        new("ar", "Arabic",     "العربية",    "🇸🇦"),
        new("zh", "Chinese",    "中文",        "🇨🇳"),
        new("pt", "Portuguese", "Português",  "🇧🇷"),
        new("ru", "Russian",    "Русский",    "🇷🇺"),
        new("ja", "Japanese",   "日本語",      "🇯🇵"),
    ];

    public string this[string key] =>
        _strings.TryGetValue(key, out var val) ? val : key;

    public LocalizationService()
    {
        var saved = Preferences.Get(LangKey, "en");
        LoadLanguage(saved);
    }

    public void SetLanguage(string languageCode)
    {
        Preferences.Set(LangKey, languageCode);
        LoadLanguage(languageCode);
    }

    private void LoadLanguage(string code)
    {
        CurrentLanguage = code;
        _strings = Strings.GetStrings(code);
    }
}
