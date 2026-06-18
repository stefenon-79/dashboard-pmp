# Count total data rows and get unique values for key columns
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$filePath = "C:\Users\marci\OneDrive\Trabalho\1 - BEmodular\1 - Clientes\1 - Hergen\3 - Pilar Programa" + [char]0xe7 + [char]0xe3 + "o\Programa" + [char]0xe7 + [char]0xe3 + "o_Global\Junho_26\PMP_Limpo.xlsx"
$wb = $excel.Workbooks.Open($filePath)
$ws = $wb.Worksheets.Item(1)

# Find actual last row (column A - Ano atual)
$lastRow = $ws.Cells.Item($ws.Rows.Count, 1).End(-4162).Row  # xlUp
Write-Output "Total data rows: $lastRow"

# Get unique clients (col 7)
$clients = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 7).Text
    if ($val -ne "") { $clients[$val] = $true }
}
Write-Output ""
Write-Output "=== UNIQUE CLIENTS ==="
Write-Output ($clients.Keys -join ", ")
Write-Output "Count: $($clients.Count)"

# Get unique projects (col 6)
$projects = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 6).Text
    if ($val -ne "") { $projects[$val] = $true }
}
Write-Output ""
Write-Output "=== UNIQUE PROJECTS ==="
Write-Output ($projects.Keys -join ", ")
Write-Output "Count: $($projects.Count)"

# Get unique etapas (col 13)
$etapas = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 13).Text
    if ($val -ne "") { $etapas[$val] = $true }
}
Write-Output ""
Write-Output "=== UNIQUE ETAPAS ==="
Write-Output ($etapas.Keys -join ", ")

# Get unique status geral (col 22)
$statusGeral = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 22).Text
    if ($val -ne "") { $statusGeral[$val] = $true }
}
Write-Output ""
Write-Output "=== UNIQUE STATUS GERAL ==="
Write-Output ($statusGeral.Keys -join ", ")

# Get unique status auto (col 16)
$statusAuto = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 16).Text
    if ($val -ne "") { $statusAuto[$val] = $true }
}
Write-Output ""
Write-Output "=== UNIQUE STATUS AUTO ==="
Write-Output ($statusAuto.Keys -join ", ")

# Count by status geral
Write-Output ""
Write-Output "=== COUNT BY STATUS GERAL ==="
$statusCount = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 22).Text
    if ($val -ne "") {
        if (-not $statusCount.ContainsKey($val)) { $statusCount[$val] = 0 }
        $statusCount[$val]++
    }
}
foreach ($key in $statusCount.Keys) {
    Write-Output "$key : $($statusCount[$key])"
}

# Count by client
Write-Output ""
Write-Output "=== COUNT BY CLIENT ==="
$clientCount = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 7).Text
    if ($val -ne "") {
        if (-not $clientCount.ContainsKey($val)) { $clientCount[$val] = 0 }
        $clientCount[$val]++
    }
}
foreach ($key in $clientCount.Keys) {
    Write-Output "$key : $($clientCount[$key])"
}

# Count by etapa
Write-Output ""
Write-Output "=== COUNT BY ETAPA ==="
$etapaCount = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $val = $ws.Cells.Item($r, 13).Text
    if ($val -ne "") {
        if (-not $etapaCount.ContainsKey($val)) { $etapaCount[$val] = 0 }
        $etapaCount[$val]++
    }
}
foreach ($key in $etapaCount.Keys) {
    Write-Output "$key : $($etapaCount[$key])"
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
