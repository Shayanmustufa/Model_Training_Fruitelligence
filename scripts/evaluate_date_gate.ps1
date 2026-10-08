param(
    [int]$BatchSize = 16,
    [int]$ImageSize = 640,
    [int]$Workers = 4
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$yoloRoot = Join-Path $repoRoot "training\yolov5"
$python = Join-Path $repoRoot "training\.venv\Scripts\python.exe"
$dataset = Join-Path $repoRoot "Dates Detection.date-gate.dataset"
$weights = Join-Path $repoRoot "training\runs\detect\date-gate-yolov5n-grouped\weights\best.pt"
$evalProject = Join-Path $repoRoot "training\runs\test"
$evalName = "date-gate-yolov5n"

foreach ($requiredPath in @(
    (Join-Path $yoloRoot "val.py"),
    $python,
    (Join-Path $dataset "data.yaml"),
    $weights
)) {
    if (-not (Test-Path -LiteralPath $requiredPath -PathType Leaf)) {
        throw "Required evaluation file is missing: $requiredPath"
    }
}

Push-Location $yoloRoot
try {
    & $python val.py `
        --weights $weights `
        --data (Join-Path $dataset "data.yaml") `
        --task test `
        --batch-size $BatchSize `
        --imgsz $ImageSize `
        --device 0 `
        --workers $Workers `
        --project $evalProject `
        --name $evalName
    if ($LASTEXITCODE -ne 0) {
        throw "YOLOv5 test evaluation exited with code $LASTEXITCODE"
    }
}
finally {
    Pop-Location
}
