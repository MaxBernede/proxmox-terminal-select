# Generates, from content.js:
#  - proxmox-terminal-select.user.js  (Violentmonkey/Tampermonkey userscript, committed to the repo)
#  - proxmox-terminal-select.xpi      (unsigned extension, for temporary loading or AMO signing)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)

$manifest = Get-Content manifest.json -Raw -Encoding UTF8 | ConvertFrom-Json
$version  = $manifest.version
$raw      = 'https://raw.githubusercontent.com/MaxBernede/proxmox-terminal-select/main/proxmox-terminal-select.user.js'

$header = @"
// ==UserScript==
// @name         Proxmox Terminal Select
// @namespace    https://github.com/MaxBernede/proxmox-terminal-select
// @version      $version
// @description  Select & copy text in the Proxmox xterm.js terminal, even when an app grabs the mouse (Claude Code, htop, vim...)
// @author       MaxBernede
// @homepageURL  https://github.com/MaxBernede/proxmox-terminal-select
// @downloadURL  $raw
// @updateURL    $raw
// @match        *://*/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

"@
$body = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'content.js'), $utf8)
[IO.File]::WriteAllText((Join-Path $PSScriptRoot 'proxmox-terminal-select.user.js'), ($header + $body).Replace("`r`n", "`n"), $utf8)
Write-Host "OK -> proxmox-terminal-select.user.js (v$version)"

Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$xpi = Join-Path $PSScriptRoot 'proxmox-terminal-select.xpi'
if (Test-Path $xpi) { Remove-Item $xpi }
$zip = [IO.Compression.ZipFile]::Open($xpi, 'Create')
foreach ($f in 'manifest.json', 'content.js') {
  [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $PSScriptRoot $f), $f)
}
$zip.Dispose()
Write-Host "OK -> proxmox-terminal-select.xpi (v$version)"

# Zip containing a folder, to extract then load via about:debugging / "Load unpacked"
$zp = Join-Path $PSScriptRoot 'proxmox-terminal-select.zip'
if (Test-Path $zp) { Remove-Item $zp }
$zip = [IO.Compression.ZipFile]::Open($zp, 'Create')
foreach ($f in 'manifest.json', 'content.js', 'README.md', 'LICENSE') {
  [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $PSScriptRoot $f), "proxmox-terminal-select/$f")
}
$zip.Dispose()
Write-Host "OK -> proxmox-terminal-select.zip (v$version)"
