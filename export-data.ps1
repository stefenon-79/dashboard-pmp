# Export PMP data from Excel to JSON for React consumption
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$filePath = "C:\Users\marci\OneDrive\Trabalho\1 - BEmodular\1 - Clientes\1 - Hergen\3 - Pilar Programa" + [char]0xe7 + [char]0xe3 + "o\Programa" + [char]0xe7 + [char]0xe3 + "o_Global\Junho_26\PMP_Limpo.xlsx"

Write-Output "Opening file..."
$wb = $excel.Workbooks.Open($filePath)
$ws = $wb.Worksheets.Item(1)

$lastRow = $ws.Cells.Item($ws.Rows.Count, 1).End(-4162).Row
Write-Output "Total rows: $lastRow"

$records = @()

for ($r = 2; $r -le $lastRow; $r++) {
    if ($r % 500 -eq 0) { Write-Output "Processing row $r of $lastRow..." }

    $anoAtual = $ws.Cells.Item($r, 1).Text
    $anoReal = $ws.Cells.Item($r, 2).Text
    $mesProg = $ws.Cells.Item($r, 3).Text
    $prazoEntrega = $ws.Cells.Item($r, 4).Text
    $dataLiberacao = $ws.Cells.Item($r, 5).Text
    $projeto = $ws.Cells.Item($r, 6).Text
    $cliente = $ws.Cells.Item($r, 7).Text.Trim()
    $lc = $ws.Cells.Item($r, 8).Text
    $cjEquipamento = $ws.Cells.Item($r, 9).Text
    $conjGeral = $ws.Cells.Item($r, 10).Text
    $equipamento = $ws.Cells.Item($r, 11).Text
    $kits = $ws.Cells.Item($r, 12).Text
    $etapa = $ws.Cells.Item($r, 13).Text.Trim()
    $progSemana = $ws.Cells.Item($r, 14).Text
    $realSemana = $ws.Cells.Item($r, 15).Text
    $statusAuto = $ws.Cells.Item($r, 16).Text
    $reprogSemana = $ws.Cells.Item($r, 17).Text
    $reprogRealSemana = $ws.Cells.Item($r, 18).Text
    $statusManual = $ws.Cells.Item($r, 19).Text
    $observacao = $ws.Cells.Item($r, 20).Text
    $avanco = $ws.Cells.Item($r, 21).Text
    $statusGeral = $ws.Cells.Item($r, 22).Text
    $realizadoSemana = $ws.Cells.Item($r, 23).Text
    $programado = $ws.Cells.Item($r, 24).Text

    # Normalize client names (fix duplicates with trailing spaces or casing)
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

    $record = [ordered]@{
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

    $records += $record
}

Write-Output "Converting to JSON..."
$json = $records | ConvertTo-Json -Depth 3 -Compress

$outputPath = Join-Path $PSScriptRoot "src\data\pmp-data.json"
$outputDir = Split-Path $outputPath
if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }

[System.IO.File]::WriteAllText($outputPath, $json, [System.Text.Encoding]::UTF8)

Write-Output "Exported $($records.Count) records to $outputPath"

$wb.Close($false)
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
Write-Output "Done!"
