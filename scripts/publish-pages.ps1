param(
    [ValidatePattern('^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$')]
    [string]$Repository = 'urbantorque/lantern-guard'
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
$ghPath = if ($ghCommand) { $ghCommand.Source } else { Join-Path $env:ProgramFiles 'GitHub CLI/gh.exe' }
if (-not (Test-Path -LiteralPath $ghPath)) { throw 'Install the GitHub CLI and sign in before publishing.' }

function Invoke-Git {
    param([string[]]$GitArguments)
    $result = & git @GitArguments
    if ($LASTEXITCODE -ne 0) { throw "Git failed: git $($GitArguments -join ' ')" }
    return $result
}

function Invoke-GitHub {
    param([string[]]$GhArguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $result = & $ghPath @GhArguments 2>&1
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    return @{ ExitCode = $exitCode; Output = ($result | Out-String).Trim() }
}

Push-Location $projectRoot
try {
    $origin = Invoke-Git -GitArguments @('remote', 'get-url', 'origin')
    if ($origin -notin @("https://github.com/$Repository.git", "https://github.com/$Repository", "git@github.com:$Repository.git")) {
        throw "Origin does not match $Repository. Refusing to publish."
    }
    if (Invoke-Git -GitArguments @('status', '--porcelain')) { throw 'Commit all source changes before publishing.' }
    $sourceCommit = Invoke-Git -GitArguments @('rev-parse', 'HEAD')

    $pages = Invoke-GitHub -GhArguments @('api', "repos/$Repository/pages")
    $createPages = $pages.ExitCode -ne 0
    if ($createPages) {
        if ($pages.Output -notmatch 'HTTP 404') { throw $pages.Output }
    } else {
        $configuration = $pages.Output | ConvertFrom-Json
        if ($configuration.build_type -ne 'legacy' -or $configuration.source.branch -ne 'gh-pages' -or $configuration.source.path -ne '/') {
            throw 'This repository already uses another Pages configuration. Refusing to replace it.'
        }
    }

    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'The production build failed.' }
    $distPath = Join-Path $projectRoot 'dist'
    Set-Content -LiteralPath (Join-Path $distPath '.nojekyll') -Value '' -NoNewline
    @{ sourceCommit = $sourceCommit } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $distPath 'build-info.json') -Encoding UTF8

    $parentCommit = $null
    $remoteBranch = Invoke-Git -GitArguments @('ls-remote', 'origin', 'refs/heads/gh-pages')
    if ($remoteBranch) {
        Invoke-Git -GitArguments @('fetch', '--no-tags', 'origin', 'gh-pages') | Out-Host
        $parentCommit = Invoke-Git -GitArguments @('rev-parse', 'FETCH_HEAD')
    }

    $gitDirectory = Invoke-Git -GitArguments @('rev-parse', '--absolute-git-dir')
    $artifactDirectory = Join-Path $projectRoot 'dist-artifact'
    New-Item -ItemType Directory -Path $artifactDirectory -Force | Out-Null
    $temporaryIndex = Join-Path $artifactDirectory ("pages-{0}.index" -f [guid]::NewGuid())
    $previousIndex = $env:GIT_INDEX_FILE
    try {
        $env:GIT_INDEX_FILE = $temporaryIndex
        $buildGit = @('-C', $distPath, "--git-dir=$gitDirectory", "--work-tree=$distPath")
        Invoke-Git ($buildGit + @('read-tree', '--empty')) | Out-Null
        Invoke-Git ($buildGit + @('add', '--all', '--', '.')) | Out-Null
        $tree = Invoke-Git ($buildGit + @('write-tree'))
        $commitArguments = @('commit-tree', $tree, '-m', "Publish Lantern Guard from $sourceCommit")
        if ($parentCommit) { $commitArguments += @('-p', $parentCommit) }
        $deploymentCommit = Invoke-Git $commitArguments
    } finally {
        $env:GIT_INDEX_FILE = $previousIndex
        foreach ($indexFile in @($temporaryIndex, "$temporaryIndex.lock")) {
            if (Test-Path -LiteralPath $indexFile) { Remove-Item -LiteralPath $indexFile -Force }
        }
    }

    Invoke-Git -GitArguments @('push', 'origin', "${deploymentCommit}:refs/heads/gh-pages") | Out-Host
    if ($createPages) {
        $configurationPath = Join-Path $artifactDirectory 'pages-config.json'
        '{"build_type":"legacy","source":{"branch":"gh-pages","path":"/"}}' | Set-Content -LiteralPath $configurationPath -Encoding ASCII
        $created = Invoke-GitHub -GhArguments @('api', '--silent', '--method', 'POST', "repos/$Repository/pages", '--input', $configurationPath)
        if ($created.ExitCode -ne 0) {
            # The service can create the site even when the CLI cannot read its response.
            $confirmation = Invoke-GitHub -GhArguments @('api', "repos/$Repository/pages")
            if ($confirmation.ExitCode -ne 0) { throw $created.Output }
            $confirmedSite = $confirmation.Output | ConvertFrom-Json
            if ($confirmedSite.build_type -ne 'legacy' -or $confirmedSite.source.branch -ne 'gh-pages' -or $confirmedSite.source.path -ne '/') {
                throw $created.Output
            }
        }
    }

    $published = Invoke-GitHub -GhArguments @('api', "repos/$Repository/pages")
    if ($published.ExitCode -ne 0) { throw $published.Output }
    $site = $published.Output | ConvertFrom-Json
    Write-Host "Published source: $sourceCommit"
    Write-Host "Deployment commit: $deploymentCommit"
    Write-Host "Play: $($site.html_url)?muted=1"
    Write-Host "Check deployment: gh api repos/$Repository/pages/builds/latest"
} finally {
    Pop-Location
}
