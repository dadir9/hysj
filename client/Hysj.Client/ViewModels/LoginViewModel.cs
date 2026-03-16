using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class LoginViewModel : ObservableObject
{
    private readonly IApiService       _api;
    private readonly IAuthStateService _auth;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private string _username = string.Empty;
    [ObservableProperty] private string _password = string.Empty;
    [ObservableProperty] private string _totpCode = string.Empty;
    [ObservableProperty] private bool   _showTotp;
    [ObservableProperty] private bool   _isBusy;
    [ObservableProperty] private string _errorMessage = string.Empty;

    public LoginViewModel(IApiService api, IAuthStateService auth, ILocalizationService loc)
    {
        _api  = api;
        _auth = auth;
        _loc  = loc;
    }

    [RelayCommand]
    private async Task LoginAsync()
    {
        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password)) return;
        IsBusy       = true;
        ErrorMessage = string.Empty;
        try
        {
            var res = await _api.LoginAsync(new LoginRequest(Username, Password, ShowTotp ? TotpCode : null));
            _auth.SetSession(res.Token, res.UserId, res.Username);
            await Shell.Current.GoToAsync("//ConversationListPage");
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Unauthorized)
        {
            if (!ShowTotp) { ShowTotp = true; ErrorMessage = _loc["login_enter_2fa"]; }
            else ErrorMessage = _loc["login_invalid_credentials"];
        }
        catch
        {
            ErrorMessage = _loc["error_connection"];
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task GoToRegisterAsync() =>
        await Shell.Current.GoToAsync("//RegisterPage");
}
