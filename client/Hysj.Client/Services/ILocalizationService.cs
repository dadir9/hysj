namespace Hysj.Client.Services;

public interface ILocalizationService
{
    string CurrentLanguage { get; }
    string this[string key] { get; }
    void SetLanguage(string languageCode);
    IReadOnlyList<LanguageOption> AvailableLanguages { get; }
}

public record LanguageOption(string Code, string Name, string NativeName, string Flag);
