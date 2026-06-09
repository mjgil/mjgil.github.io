$ErrorActionPreference = 'Stop'

$RealInstallerUrl = $env:ZDU_INSTALLER_URL
if ([string]::IsNullOrWhiteSpace($RealInstallerUrl)) {
  $RealInstallerUrl = 'https://raw.githubusercontent.com/mjgil-zig/zdu/main/install.ps1'
}

Invoke-Expression (Invoke-WebRequest -UseBasicParsing -Uri $RealInstallerUrl).Content
