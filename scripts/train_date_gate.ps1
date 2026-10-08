param(
    [int]$Epochs = 100,
    [int]$Patience = 20,
    [int]$BatchSize = 16,
    [int]$ImageSize = 640,
    [int]$Workers = 4
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$yoloRoot = Join-Path $repoRoot "training\yolov5"
$python = Join-Path $repoRoot "training\.venv\Scripts\python.exe"
$dataset = Join-Path $repoRoot "Dates Detection.date-gate.dataset"
$runProject = Join-Path $repoRoot "training\runs\detect"
$runName = "date-gate-yolov5n-grouped"
$runPath = Join-Path $runProject $runName

foreach ($requiredPath in @(
    (Join-Path $yoloRoot "train.py"),
    $python,
    (Join-Path $dataset "data.yaml")
)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required training file is missing: $requiredPath"
    }
}

if (Test-Path -LiteralPath $runPath) {
    throw "Training output already exists: $runPath. Rename the run or move the old results first."
}

New-Item -ItemType Directory -Path $runProject -Force | Out-Null
Push-Location $yoloRoot
try {
    & $python train.py `
        --weights yolov5n.pt `
        --data (Join-Path $dataset "data.yaml") `
        --epochs $Epochs `
        --patience $Patience `
        --batch-size $BatchSize `
        --imgsz $ImageSize `
        --device 0 `
        --workers $Workers `
        --seed 2026 `
        --project $runProject `
        --name $runName
    if ($LASTEXITCODE -ne 0) {
        throw "YOLOv5 training exited with code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
