using System.Collections.ObjectModel;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using Hysj.Client.Models;
using DeviceInfo = Hysj.Client.Models.DeviceInfo;
using Hysj.Client.Services;

namespace Hysj.Client.ViewModels;

public partial class SecurityViewModel : ObservableObject
{
    private readonly IApiService          _api;
    private readonly IWipeService         _wipe;
    private readonly IAuthStateService    _auth;
    private readonly ILocalizationService _loc;

    [ObservableProperty] private ObservableCollection<DeviceInfo> _devices = [];
    [ObservableProperty] private ObservableCollection<RelayNodeDto> _relayNodes = [];
    [ObservableProperty] private bool   _isBusy;

    // Crypto layer status — always all enabled
    public bool DoubleRatchetEnabled => true;
    public bool QuantumEnabled       => true;
    public bool SealedSenderEnabled  => true;
    public bool OnionRoutingEnabled  => true;

    public SecurityViewModel(
        IApiService api, IWipeService wipe,
        IAuthStateService auth, ILocalizationService loc)
    {
        _api  = api;
        _wipe = wipe;
        _auth = auth;
        _loc  = loc;
    }

    public async Task InitAsync()
    {
        IsBusy = true;
        try
        {
            var devices = await _api.GetDevicesAsync();
            Devices = new ObservableCollection<DeviceInfo>(devices);

            var nodes = await _api.GetRelayNodesAsync();
            RelayNodes = new ObservableCollection<RelayNodeDto>(nodes);
        }
        catch { /* offline — show cached */ }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task RemoveDeviceAsync(DeviceInfo device)
    {
        bool confirmed = await Shell.Current.DisplayAlert(
            _loc["security_remove_device"],
            _loc["security_remove_device_confirm"],
            _loc["yes"], _loc["no"]);

        if (!confirmed) return;
        await _api.DeleteDeviceAsync(device.Id);
        Devices.Remove(device);
    }

    [RelayCommand]
    private async Task WipeAllAsync()
    {
        bool confirmed = await Shell.Current.DisplayAlert(
            _loc["wipe_all_title"],
            _loc["wipe_all_confirm"],
            _loc["yes"], _loc["no"]);

        if (!confirmed) return;
        await _wipe.WipeAllAsync();
        await Shell.Current.GoToAsync("//LoginPage");
    }

    [RelayCommand]
    private async Task GoBackAsync() =>
        await Shell.Current.GoToAsync("..");
}
