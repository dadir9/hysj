using Hysj.Client.ViewModels;

namespace Hysj.Client.Views;

public partial class LanguageSelectionPage : ContentPage
{
    public LanguageSelectionPage(LanguageSelectionViewModel vm)
    {
        InitializeComponent();
        BindingContext = vm;
    }
}
