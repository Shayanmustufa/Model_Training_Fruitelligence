param(
    [ValidateRange(1, 100)]
    [int]$Count = 20,
    [string]$Destination = (Join-Path $env:USERPROFILE "Desktop\date_detection_pilot\negatives\wikimedia")
)

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$apiUrl = "https://commons.wikimedia.org/w/api.php"
$searchTerms = @(
    "apples filetype:bitmap",
    "bananas filetype:bitmap",
    "oranges filetype:bitmap",
    "pears filetype:bitmap",
    "lemons filetype:bitmap",
    "tomatoes filetype:bitmap",
    "vegetables filetype:bitmap"
)
$allowedLicense = '(?i)(CC0|CC BY(?:-SA)?(?:\s|$)|Creative Commons Attribution|public domain)'
$excludedText = '(?i)\b(date|dates|tamr|tamrah|rutab|khajur)\b'
$userAgent = "AgrovisoonDateDetectionPilot/1.0 (local educational dataset preparation)"

New-Item -ItemType Directory -Path $Destination -Force | Out-Null
$manifestPath = Join-Path $Destination "sources.csv"
$records = [System.Collections.Generic.List[object]]::new()
$seenTitles = @{}
$downloaded = 0
$perTermLimit = [Math]::Ceiling($Count / $searchTerms.Count)

foreach ($term in $searchTerms) {
    if ($downloaded -ge $Count) { break }
    $termDownloaded = 0

    $query = [uri]::EscapeDataString($term)
    $uriBuilder = [System.UriBuilder]::new($apiUrl)
    $uriBuilder.Query = "action=query&format=json&generator=search&gsrsearch=$query&gsrnamespace=6&gsrlimit=50&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1200"
    $requestUri = $uriBuilder.Uri.AbsoluteUri

    try {
        $response = Invoke-RestMethod -Uri $requestUri -Headers @{ "User-Agent" = $userAgent } -TimeoutSec 45
    }
    catch {
        throw "Wikimedia Commons search failed for '$term' at $requestUri. Check your internet connection and try again. Details: $($_.Exception.Message)"
    }

    if (-not $response.query -or -not $response.query.pages) {
        Write-Warning "No results returned for '$term'."
        continue
    }

    foreach ($page in $response.query.pages.PSObject.Properties.Value) {
        if ($downloaded -ge $Count) { break }
        if ($termDownloaded -ge $perTermLimit) { break }
        if ($seenTitles.ContainsKey($page.title)) { continue }
        $seenTitles[$page.title] = $true

        $info = $page.imageinfo | Select-Object -First 1
        if (-not $info -or $info.mime -notin @("image/jpeg", "image/png")) { continue }

        $license = [System.Net.WebUtility]::HtmlDecode([string]$info.extmetadata.LicenseShortName.value)
        if ($license -notmatch $allowedLicense) { continue }

        $description = [System.Net.WebUtility]::HtmlDecode([string]$info.extmetadata.ImageDescription.value)
        if (("$($page.title) $description") -match $excludedText) { continue }

        $downloadUrl = $info.thumburl
        if (-not $downloadUrl) { $downloadUrl = $info.url }
        if (-not $downloadUrl -or ([uri]$downloadUrl).Scheme -ne "https") { continue }

        $extension = [IO.Path]::GetExtension(([uri]$downloadUrl).AbsolutePath)
        if ($extension -notin @(".jpg", ".jpeg", ".png")) { continue }

        $fileName = "wikimedia_{0:D2}{1}" -f ($downloaded + 1), $extension
        $filePath = Join-Path $Destination $fileName
        try {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $filePath -Headers @{ "User-Agent" = $userAgent } -TimeoutSec 60
            if (-not (Test-Path -LiteralPath $filePath) -or (Get-Item -LiteralPath $filePath).Length -lt 1024) {
                Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue
                continue
            }
        }
        catch {
            Remove-Item -LiteralPath $filePath -Force -ErrorAction SilentlyContinue
            Write-Warning "Could not download '$($page.title)': $($_.Exception.Message)"
            continue
        }

        $artist = [System.Net.WebUtility]::HtmlDecode([string]$info.extmetadata.Artist.value)
        $credit = [System.Net.WebUtility]::HtmlDecode([string]$info.extmetadata.Credit.value)
        $records.Add([pscustomobject]@{
            File        = $fileName
            Title       = $page.title
            License     = $license
            Artist      = ($artist -replace '<[^>]+>', ' ').Trim()
            Credit      = ($credit -replace '<[^>]+>', ' ').Trim()
            SourcePage  = $info.descriptionurl
            DownloadUrl = $downloadUrl
        })
        $downloaded++
        $termDownloaded++
        Write-Host "Downloaded $downloaded/$Count : $fileName"
    }
}

if ($records.Count -gt 0) {
    $records | Export-Csv -LiteralPath $manifestPath -NoTypeInformation -Encoding UTF8
}

Write-Host ""
Write-Host "Saved $downloaded image(s) in: $Destination"
if ($downloaded -lt $Count) {
    Write-Warning "Only $downloaded matching images were found. Run again later or lower -Count."
}
Write-Host "Source and license details: $manifestPath"
Write-Warning "Review every image manually before labeling it as a negative. Search metadata cannot prove that no dates appear in the picture."
