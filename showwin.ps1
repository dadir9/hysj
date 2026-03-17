Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int x, int y, int w, int h, bool repaint);
}
"@

$proc = Get-Process 'Hysj.Client' -ErrorAction SilentlyContinue | Select-Object -First 1
if ($proc) {
    Write-Host "Found process: $($proc.Id), Handle: $($proc.MainWindowHandle)"
    if ($proc.MainWindowHandle -ne 0) {
        [Win32]::ShowWindow($proc.MainWindowHandle, 9) | Out-Null
        [Win32]::MoveWindow($proc.MainWindowHandle, 50, 50, 420, 750, $true) | Out-Null
        [Win32]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
        Write-Host "Window brought to front"
    } else {
        Write-Host "No window handle (app may not have a visible window yet)"
    }
} else {
    Write-Host "Process not found"
}
