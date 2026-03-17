Add-Type -AssemblyName System.Windows.Forms
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
}
"@

$vs = Get-Process devenv -ErrorAction SilentlyContinue | Select-Object -First 1
if ($vs) {
    [Win32]::ShowWindow($vs.MainWindowHandle, 9) | Out-Null
    [Win32]::SetForegroundWindow($vs.MainWindowHandle) | Out-Null
    Start-Sleep -Milliseconds 800
    [System.Windows.Forms.SendKeys]::SendWait("{F5}")
    Write-Host "F5 sendt til Visual Studio"
} else {
    Write-Host "Visual Studio er ikke aapen"
}
