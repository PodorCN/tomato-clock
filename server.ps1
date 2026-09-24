$candidatePorts = @(8080, 8088, 3000, 5500, 8000, 8888, 9000)
$listener = $null
$boundPort = 0
$root = (Get-Location).Path

foreach ($p in $candidatePorts) {
    try {
        $temp = New-Object System.Net.HttpListener
        $temp.Prefixes.Add("http://127.0.0.1:$p/")
        $temp.Start()
        $listener = $temp
        $boundPort = $p
        break
    } catch {
        if ($temp) { try { $temp.Close() } catch {} }
    }
}

if (-not $listener) {
    Write-Error "Could not bind to any candidate port."
    exit 1
}

$url = "http://127.0.0.1:$boundPort/"
Write-Host "================================================="
Write-Host "🍅 Tomato Clock HTTP Server is LIVE!"
Write-Host "Access URL: $url"
Write-Host "Serving directory: $root"
Write-Host "================================================="

# Launch browser
try {
    Start-Process $url
} catch {
    Write-Host "Browser launch note: $_"
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".ico"  = "image/x-icon"
    ".mp3"  = "audio/mpeg"
    ".wav"  = "audio/wav"
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $relPath = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($relPath)) {
            $relPath = "index.html"
        }
        
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            if ($mimeTypes.ContainsKey($ext)) {
                $response.ContentType = $mimeTypes[$ext]
            } else {
                $response.ContentType = "application/octet-stream"
            }

            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Cache-Control", "no-cache, no-store, must-revalidate")

            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
            $response.ContentLength64 = $notFoundBytes.Length
            $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
        }
        $response.OutputStream.Close()
    }
} finally {
    if ($listener) {
        $listener.Stop()
        $listener.Close()
    }
}
