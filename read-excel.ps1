$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$filePath = "C:\Users\marci\OneDrive\Trabalho\1 - BEmodular\1 - Clientes\1 - Hergen\3 - Pilar Programa" + [char]0xe7 + [char]0xe3 + "o\Programa" + [char]0xe7 + [char]0xe3 + "o_Global\Junho_26\PMP_Limpo.xlsx"

Write-Output "Trying path: $filePath"

$wb = $excel.Workbooks.Open($filePath)

Write-Output "=== SHEETS ==="
foreach ($ws in $wb.Worksheets) {
    Write-Output ("Sheet: " + $ws.Name + " | Rows: " + $ws.UsedRange.Rows.Count + " | Cols: " + $ws.UsedRange.Columns.Count)
}

Write-Output ""
Write-Output "=== HEADERS (1st sheet) ==="
$ws1 = $wb.Worksheets.Item(1)
$cols = $ws1.UsedRange.Columns.Count
$headers = @()
for ($c = 1; $c -le $cols; $c++) {
    $headers += $ws1.Cells.Item(1, $c).Text
}
Write-Output ($headers -join " | ")

Write-Output ""
Write-Output "=== FIRST 10 DATA ROWS ==="
$maxRow = [Math]::Min($ws1.UsedRange.Rows.Count, 11)
for ($r = 2; $r -le $maxRow; $r++) {
    $row = @()
    for ($c = 1; $c -le $cols; $c++) {
        $row += $ws1.Cells.Item($r, $c).Text
    }
    Write-Output ($row -join " | ")
}

if ($wb.Worksheets.Count -gt 1) {
    Write-Output ""
    Write-Output "=== HEADERS (2nd sheet) ==="
    $ws2 = $wb.Worksheets.Item(2)
    $cols2 = $ws2.UsedRange.Columns.Count
    $headers2 = @()
    for ($c = 1; $c -le $cols2; $c++) {
        $headers2 += $ws2.Cells.Item(1, $c).Text
    }
    Write-Output ($headers2 -join " | ")

    Write-Output ""
    Write-Output "=== FIRST 5 DATA ROWS (2nd sheet) ==="
    $maxRow2 = [Math]::Min($ws2.UsedRange.Rows.Count, 6)
    for ($r = 2; $r -le $maxRow2; $r++) {
        $row2 = @()
        for ($c = 1; $c -le $cols2; $c++) {
            $row2 += $ws2.Cells.Item($r, $c).Text
        }
        Write-Output ($row2 -join " | ")
    }
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
