using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class RegisterViewModel : ObservableObject
{
    private readonly IApiService          _api;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private string _username     = string.Empty;
    [ObservableProperty] private string _password     = string.Empty;
    [ObservableProperty] private string _confirmPass  = string.Empty;
    [ObservableProperty] private bool   _isBusy;
    [ObservableProperty] private string _errorMessage = string.Empty;
    [ObservableProperty] private string _totpSecret   = string.Empty;
    [ObservableProperty] private bool   _showQr;

    public RegisterViewModel(IApiService api, ILocalizationService loc)
    {
        _api = api;
        _loc = loc;
    }

    [RelayCommand]
    private async Task RegisterAsync()
    {
        if (string.IsNullOrWhiteSpace(Username) || string.IsNullOrWhiteSpace(Password))
        {
            ErrorMessage = _loc["register_fields_required"];
            return;
        }
        if (Password != ConfirmPass)
        {
            ErrorMessage = _loc["register_passwords_no_match"];
            return;
        }

        IsBusy       = true;
        ErrorMessage = string.Empty;
        try
        {
            var res    = await _api.RegisterAsync(new RegisterRequest(Username, Password));
            TotpSecret = res.TotpSecret;
            ShowQr     = true;
        }
        catch (HttpRequestException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Conflict)
        {
            ErrorMessage = _loc["register_username_taken"];
        }
        catch
        {
            ErrorMessage = _loc["error_connection"];
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task GoToLoginAsync() =>
        await Shell.Current.GoToAsync("//LoginPage");
}
