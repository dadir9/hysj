using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class SettingsViewModel : ObservableObject
{
    private readonly IAuthStateService    _auth;
    private readonly ILocalizationService _loc;
    private readonly IChatService         _chat;

    [ObservableProperty] private string _username = string.Empty;
    [ObservableProperty] private ObservableCollection<LanguageOption> _languages = [];
    [ObservableProperty] private LanguageOption? _selectedLanguage;

    public SettingsViewModel(IAuthStateService auth, ILocalizationService loc, IChatService chat)
    {
        _auth = auth;
        _loc  = loc;
        _chat = chat;

        Username  = auth.Username ?? string.Empty;
        Languages = new ObservableCollection<LanguageOption>(loc.AvailableLanguages);
        SelectedLanguage = loc.AvailableLanguages
            .FirstOrDefault(l => l.Code == loc.CurrentLanguage);
    }

    partial void OnSelectedLanguageChanged(LanguageOption? value)
    {
        if (value is not null) _loc.SetLanguage(value.Code);
    }

    [RelayCommand]
    private async Task LogoutAsync()
    {
        await _chat.DisconnectAsync();
        _auth.ClearSession();
        await Shell.Current.GoToAsync("//LoginPage");
    }

    [RelayCommand]
    private async Task GoBackAsync() =>
        await Shell.Current.GoToAsync("..");
}
