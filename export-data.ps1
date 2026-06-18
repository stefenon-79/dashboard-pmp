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

# --- Normalization Helper Functions ---

function Clean-Spaces($val) {
    if ($null -eq $val) { return "" }
    return ($val.ToString().Trim() -replace '\s+', ' ')
}

function Normalize-ClientNameBasic($c) {
    $clean = Clean-Spaces $c
    if ($clean -eq "") { return "" }
    
    # Standardize casing / spacing / obvious spelling
    if ($clean -match "SMUFIT|SMURFIT") {
        if ($clean -match "ARGENTINA") { return "SMURFIT KAPPA ARG" }
        if ($clean -match "KAPPA") { return "SMURFIT KAPPA" }
        return "SMURFIT"
    }
    if ($clean -match "ARAUC") {
        if ($clean -match "PAP") { return "ARAUCÁRIA PAPÉIS" }
        return "ARAUCÁRIA"
    }
    if ($clean -match "ADAMI") {
        if ($clean -match "MADEIRA|S/A") { return "ADAMI S/A" }
        return "ADAMI"
    }
    if ($clean -match "IBERKRAFT") { return "IBERKRAFT" }
    if ($clean -match "APIS") { return "APIS" }
    
    return $clean.ToUpper()
}

function Normalize-StageName($e) {
    $clean = Clean-Spaces $e
    if ($clean -eq "") { return "" }
    
    # Case-insensitive checks
    if ($clean -ieq "Acabamento") { return "Acabamento" }
    if ($clean -ieq "Anodização" -or $clean -ieq "anodizacao" -or $clean -ieq "anodização") { return "Anodização" }
    if ($clean -ieq "CDI") { return "CDI" }
    if ($clean -ieq "Corte") { return "Corte" }
    if ($clean -ieq "Montagem") { return "Montagem" }
    if ($clean -ieq "Montagem 1") { return "Montagem 1" }
    if ($clean -ieq "Montagem 2") { return "Montagem 2" }
    if ($clean -ieq "PRE CDI" -or $clean -ieq "PRE-CDI" -or $clean -ieq "Pré CDI" -or $clean -ieq "Pré-CDI") { return "Pré CDI" }
    if ($clean -ieq "Usinagem cilindros" -or $clean -ieq "Usinagem de cilindros") { return "Usinagem cilindros" }
    if ($clean -ieq "Caldeiraria (revestimento)" -or $clean -ieq "calderaria (revestimento)") { return "Caldeiraria (revestimento)" }
    
    # Standardize other stages to Title Case
    if ($clean.Length -gt 1) {
        if ($clean -match "^[A-Z\s]+$") {
            return $clean.ToUpper()
        }
        return $clean.Substring(0, 1).ToUpper() + $clean.Substring(1)
    }
    return $clean.ToUpper()
}

function Normalize-Week($w) {
    $clean = Clean-Spaces $w
    if ($clean -eq "" -or $clean -eq "0" -or $clean -eq "0.0" -or $clean -eq "0,0") {
        return ""
    }
    
    # If it is a range like "32-35", extract the first number
    if ($clean -match "^(\d+)\s*-\s*(\d+)$") {
        return $Matches[1]
    }
    
    # If it is a decimal like "32.0"
    if ($clean -match "^(\d+)\.0$") {
        return $Matches[1]
    }
    
    return $clean
}

# --- First Pass: Build Project to Client Frequency Map to resolve conflicts ---
Write-Output "Resolving project-client mapping conflicts..."
$projectClientFreq = @{}
for ($r = 2; $r -le $lastRow; $r++) {
    $proj = (Get-Val $r 6).Trim()
    $cli = Get-Val $r 7
    if ($proj -and $cli) {
        $cliClean = Normalize-ClientNameBasic $cli
        if ($cliClean) {
            if (-not $projectClientFreq.ContainsKey($proj)) {
                $projectClientFreq[$proj] = @{}
            }
            if (-not $projectClientFreq[$proj].ContainsKey($cliClean)) {
                $projectClientFreq[$proj][$cliClean] = 0
            }
            $projectClientFreq[$proj][$cliClean]++
        }
    }
}

# Resolve to the most frequent client name for each project
$resolvedProjectClients = @{}
foreach ($proj in $projectClientFreq.Keys) {
    $cliMap = $projectClientFreq[$proj]
    $bestCli = ""
    $maxCount = -1
    foreach ($cli in $cliMap.Keys) {
        if ($cliMap[$cli] -gt $maxCount) {
            $maxCount = $cliMap[$cli]
            $bestCli = $cli
        }
    }
    $resolvedProjectClients[$proj] = $bestCli
}

# --- Second Pass: Process & Export Records ---
Write-Output "Processing records and applying corrections..."
# Using a generic List for maximum performance (avoids array copying overhead)
$records = [System.Collections.Generic.List[PSCustomObject]]::new()

for ($r = 2; $r -le $lastRow; $r++) {
    $anoAtual = Get-Val $r 1
    $anoReal = Get-Val $r 2
    $mesProg = Clean-Spaces (Get-Val $r 3)
    $prazoEntrega = Clean-Spaces (Get-Val $r 4)
    $dataLiberacao = Clean-Spaces (Get-Val $r 5)
    $projeto = Clean-Spaces (Get-Val $r 6)
    $cliente = Get-Val $r 7
    $lc = Clean-Spaces (Get-Val $r 8)
    $cjEquipamento = Clean-Spaces (Get-Val $r 9)
    $conjGeral = Clean-Spaces (Get-Val $r 10)
    $equipamento = Clean-Spaces (Get-Val $r 11)
    $kits = Clean-Spaces (Get-Val $r 12)
    $etapa = Get-Val $r 13
    $progSemana = Get-Val $r 14
    $realSemana = Get-Val $r 15
    $statusAuto = Clean-Spaces (Get-Val $r 16)
    $reprogSemana = Get-Val $r 17
    $reprogRealSemana = Get-Val $r 18
    $statusManual = Clean-Spaces (Get-Val $r 19)
    $observacao = Clean-Spaces (Get-Val $r 20)
    $avanco = Clean-Spaces (Get-Val $r 21)
    $statusGeral = Clean-Spaces (Get-Val $r 22)
    $realizadoSemana = Get-Val $r 23
    $programado = Get-Val $r 24

    # Resolve Client Name
    $clienteNorm = ""
    if ($projeto -and $resolvedProjectClients.ContainsKey($projeto)) {
        $clienteNorm = $resolvedProjectClients[$projeto]
    } else {
        $clienteNorm = Normalize-ClientNameBasic $cliente
    }

    # Normalize Stage Name
    $etapaNorm = Normalize-StageName $etapa

    # Normalize Weeks
    $progSemanaNorm = Normalize-Week $progSemana
    $realSemanaNorm = Normalize-Week $realSemana
    $reprogSemanaNorm = Normalize-Week $reprogSemana
    $reprogRealSemanaNorm = Normalize-Week $reprogRealSemana
    $realizadoSemanaNorm = Normalize-Week $realizadoSemana
    $programadoNorm = Normalize-Week $programado

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
        etapa = $etapaNorm
        progSemana = $progSemanaNorm
        realSemana = $realSemanaNorm
        statusAuto = $statusAuto
        reprogSemana = $reprogSemanaNorm
        reprogRealSemana = $reprogRealSemanaNorm
        statusManual = $statusManual
        observacao = $observacao
        avanco = $avanco
        statusGeral = $statusGeral
        realizadoSemana = $realizadoSemanaNorm
        programado = $programadoNorm
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
