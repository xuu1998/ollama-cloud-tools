param(
    [Parameter(Mandatory = $true)]
    [string]$NewApiPath,
    [string]$GoCommand = ''
)

$ErrorActionPreference = 'Stop'
$pluginRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$hostRoot = (Resolve-Path -LiteralPath $NewApiPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $hostRoot 'pkg\jsplugin\cli.go'))) {
    throw 'NewApiPath 必须指向包含 pkg/jsplugin/cli.go 的 new-api 源码。'
}
if (-not $GoCommand) {
    $GoCommand = (Get-Command go -ErrorAction Stop).Source
}

& node (Join-Path $PSScriptRoot 'write-fixtures.mjs')
if ($LASTEXITCODE -ne 0) { throw '生成 fixture 失败。' }

$runner = Join-Path $PSScriptRoot 'plugincheck.exe'
Push-Location -LiteralPath $hostRoot
try {
    & $GoCommand build -o $runner (Join-Path $PSScriptRoot 'plugincheck.go')
    if ($LASTEXITCODE -ne 0) { throw '编译真实宿主校验器失败。' }
} finally {
    Pop-Location
}

& $runner lint (Join-Path $pluginRoot 'plugin.js')
if ($LASTEXITCODE -ne 0) { throw '插件宿主 lint 失败。' }
& $runner supports-new-api (Join-Path $pluginRoot 'plugin.js')
if ($LASTEXITCODE -ne 0) { throw '插件不支持绑定 New API 上游渠道。' }
if (Test-Path -LiteralPath (Join-Path $pluginRoot 'icon.svg')) {
    & $runner icon (Join-Path $pluginRoot 'icon.svg')
    if ($LASTEXITCODE -ne 0) { throw '插件 SVG 图标校验失败。' }
}
& $runner test (Join-Path $pluginRoot 'plugin.js') --fixture (Join-Path $pluginRoot 'fixtures\golden.json')
if ($LASTEXITCODE -ne 0) { throw '插件宿主 fixture 测试失败。' }
