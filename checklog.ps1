$events = Get-EventLog -LogName Application -Newest 10 -EntryType Error
foreach ($e in $events) {
    Write-Host "[$($e.TimeGenerated)] $($e.Source): $($e.Message.Substring(0, [Math]::Min(200, $e.Message.Length)))"
    Write-Host "---"
}
