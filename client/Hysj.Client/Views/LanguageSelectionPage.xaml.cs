using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class LanguageSelectionPage : ContentPage
{
    // Parameterless constructor for Shell DataTemplate
    public LanguageSelectionPage()
        : this(IPlatformApplication.Current!.Services.GetRequiredService<LanguageSelectionViewModel>())
    { }

    public LanguageSelectionPage(LanguageSelectionViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
