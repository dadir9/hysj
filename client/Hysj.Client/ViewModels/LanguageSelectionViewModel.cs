using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class LanguageSelectionViewModel : ObservableObject
{
    private readonly ILocalizationService _localization;

    public IReadOnlyList<LanguageOption> Languages => _localization.AvailableLanguages;

    [ObservableProperty]
    private LanguageOption? _selectedLanguage;

    public LanguageSelectionViewModel(ILocalizationService localization)
    {
        _localization = localization;
        _selectedLanguage = Languages.FirstOrDefault(l => l.Code == localization.CurrentLanguage)
                            ?? Languages[0];
    }

    [RelayCommand]
    private async Task ContinueAsync()
    {
        if (SelectedLanguage is not null)
            _localization.SetLanguage(SelectedLanguage.Code);

        Preferences.Set("language_selected", true);
        await Shell.Current.GoToAsync("//LoginPage");
    }
}
