# Export PMP data from Excel to JSON for React consumption (Optimized Range Reading & In-Memory Processing)
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$filePath = "C:\Users\marci\OneDrive\Trabalho\1 - BEmodular\1 - Clientes\1 - Hergen\3 - Pilar Programa" + [char]0xe7 + [char]0xe3 + "o\Programa" + [char]0xe7 + [char]0xe3 + "o_Global\Junho_26\PMP_Limpo.xlsx"

Write-Output "Opening Excel file..."
$wb = $excel.Workbooks.Open($filePath)
$ws = $wb.Worksheets.Item(1)

$lastRow = $ws.Cells.Item($ws.Rows.Count, 1).End(-4162).Row
Write-Output "Total rows found: $lastRow"

Write-Output "Reading range values..."
$range = $ws.Range("A1", "X$lastRow")
$dataMatrix = $range.Value2

# Close Excel immediately to release locks and resources
$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($range) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($ws) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($wb) | Out-Null
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
[System.GC]::Collect()
[System.GC]::WaitForPendingFinalizers()

Write-Output "Processing data in memory..."

function Get-Val($row, $col) {
    $val = $dataMatrix[$row, $col]
    if ($null -eq $val) { return "" }
    return [string]$val
}

# Using a generic List for maximum performance (avoids array copying overhead)
$records = [System.Collections.Generic.List[PSCustomObject]]::new()

for ($r = 2; $r -le $lastRow; $r++) {
    $anoAtual = Get-Val $r 1
    $anoReal = Get-Val $r 2
    $mesProg = Get-Val $r 3
    $prazoEntrega = Get-Val $r 4
    $dataLiberacao = Get-Val $r 5
    $projeto = Get-Val $r 6
    $cliente = (Get-Val $r 7).Trim()
    $lc = Get-Val $r 8
    $cjEquipamento = Get-Val $r 9
    $conjGeral = Get-Val $r 10
    $equipamento = Get-Val $r 11
    $kits = Get-Val $r 12
    $etapa = (Get-Val $r 13).Trim()
    $progSemana = Get-Val $r 14
    $realSemana = Get-Val $r 15
    $statusAuto = Get-Val $r 16
    $reprogSemana = Get-Val $r 17
    $reprogRealSemana = Get-Val $r 18
    $statusManual = Get-Val $r 19
    $observacao = Get-Val $r 20
    $avanco = Get-Val $r 21
    $statusGeral = Get-Val $r 22
    $realizadoSemana = Get-Val $r 23
    $programado = Get-Val $r 24

    # Normalize client names
    $clienteNorm = $cliente
    if ($clienteNorm -eq "SMUFIT") { $clienteNorm = "SMURFIT" }
    if ($clienteNorm -match "^SMURFIT\s*$") { $clienteNorm = "SMURFIT" }
    if ($clienteNorm -match "^SMURFIT KAPPA DE ARGENTINA") { $clienteNorm = "SMURFIT KAPPA ARG" }
    if ($clienteNorm -match "^SMURFIT KAPPA$") { $clienteNorm = "SMURFIT KAPPA" }
    if ($clienteNorm -match "^APIS\s*$") { $clienteNorm = "APIS" }
    if ($clienteNorm -match "^IBERKRAFT\s*$") { $clienteNorm = "IBERKRAFT" }
    if ($clienteNorm -match "^COPAPA\s*$") { $clienteNorm = "COPAPA" }
    if ($clienteNorm -match "^IRANI\s*$") { $clienteNorm = "IRANI" }
    if ($clienteNorm -match "ARAUC") { $clienteNorm = "ARAUCARIA" }
    if ($clienteNorm -match "^CAPRIMA") { $clienteNorm = "CAPRIMA" }
    if ($clienteNorm -match "Bragnola|BRAGAGNOLO") { $clienteNorm = "BRAGAGNOLO" }

    # Creating PSCustomObject directly is faster
    $record = [PSCustomObject]@{
        anoAtual = $anoAtual
        anoReal = $anoReal
        mesProg = $mesProg
        prazoEntrega = $prazoEntrega
        dataLiberacao = $dataLiberacao
        projeto = $projeto
        cliente = $clienteNorm
        lc = $lc
        cjEquipamento = $cjEquipamento
        conjGeral = $conjGeral
        equipamento = $equipamento
        kits = $kits
        etapa = $etapa
        progSemana = $progSemana
        realSemana = $realSemana
        statusAuto = $statusAuto
        reprogSemana = $reprogSemana
        reprogRealSemana = $reprogRealSemana
        statusManual = $statusManual
        observacao = $observacao
        avanco = $avanco
        statusGeral = $statusGeral
        realizadoSemana = $realizadoSemana
        programado = $programado
    }

    $records.Add($record)
}

Write-Output "Converting to JSON..."
$json = $records | ConvertTo-Json -Depth 3 -Compress

$outputPath = Join-Path $PSScriptRoot "src\data\pmp-data.json"
$outputDir = Split-Path $outputPath
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)

Write-Output "Exported $($records.Count) records successfully!"
