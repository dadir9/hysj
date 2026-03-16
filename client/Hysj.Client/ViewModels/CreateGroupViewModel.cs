using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class CreateGroupViewModel : ObservableObject
{
    private readonly IApiService          _api;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private string _groupName    = string.Empty;
    [ObservableProperty] private bool   _isAnonymous;
    [ObservableProperty] private bool   _membersCanAdd = true;
    [ObservableProperty] private bool   _isBusy;
    [ObservableProperty] private string _errorMessage = string.Empty;

    public CreateGroupViewModel(IApiService api, ILocalizationService loc)
    {
        _api = api;
        _loc = loc;
    }

    [RelayCommand]
    private async Task CreateAsync()
    {
        if (string.IsNullOrWhiteSpace(GroupName))
        {
            ErrorMessage = _loc["group_name_required"];
            return;
        }

        IsBusy       = true;
        ErrorMessage = string.Empty;
        try
        {
            var group = await _api.CreateGroupAsync(
                new CreateGroupRequest(GroupName, IsAnonymous, MembersCanAdd));
            await Shell.Current.GoToAsync("..");
        }
        catch
        {
            ErrorMessage = _loc["error_connection"];
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task CancelAsync() =>
        await Shell.Current.GoToAsync("..");
}
