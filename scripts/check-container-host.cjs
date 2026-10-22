// Read-only Windows prerequisites. Does not install, elevate, reboot or change settings.
const { spawnSync } = require('node:child_process');
const decode = data => data?.includes(0) ? data.toString('utf16le') : (data || Buffer.alloc(0)).toString('utf8');
function run(command, args) {
  const result = spawnSync(command, args, { windowsHide: true, timeout: 20_000 });
  return { exitCode: result.status, text: decode(result.stdout), failed: Boolean(result.error) };
}
const command = [
  '$system=Get-CimInstance Win32_ComputerSystem -ErrorAction Stop;',
  '$cpu=Get-CimInstance Win32_Processor -ErrorAction Stop | Select-Object -First 1;',
  '$features=@(Get-CimInstance Win32_OptionalFeature -ErrorAction Stop | Where-Object { $_.Name -in @(\'VirtualMachinePlatform\',\'Microsoft-Windows-Subsystem-Linux\') } | Select-Object Name,InstallState);',
  '[pscustomobject]@{HypervisorPresent=$system.HypervisorPresent;VirtualizationFirmwareEnabled=$cpu.VirtualizationFirmwareEnabled;Features=$features} | ConvertTo-Json -Compress'
].join(' ');
try {
  if (process.platform !== 'win32') throw new Error('Windows host required');
  const query = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command]);
  if (query.exitCode !== 0 || query.failed) throw new Error('Host query unavailable');
  const host = JSON.parse(query.text.replace(/^\uFEFF/, '').trim());
  if (typeof host.HypervisorPresent !== 'boolean' || !Array.isArray(host.Features) || host.Features.length === 0) throw new Error('Incomplete host query');
  const version = run('wsl.exe', ['--version']);
  const list = run('wsl.exe', ['--list', '--quiet']);
  const featureNames = ['VirtualMachinePlatform', 'Microsoft-Windows-Subsystem-Linux'];
  const featuresEnabled = featureNames.every(name => host.Features.some(feature => feature.Name === name && feature.InstallState === 1));
  const hardwareReady = host.HypervisorPresent === true || host.VirtualizationFirmwareEnabled === true;
  const ready = featuresEnabled && hardwareReady && version.exitCode === 0 && !version.failed;
  console.log(JSON.stringify({ status: ready ? 'PREREQUISITES_PRESENT' : 'PENDING_VIRTUALIZATION', host,
    wslInstalled: version.exitCode === 0 && !version.failed,
    linuxDistributionPresent: list.exitCode === 0 && list.text.trim().length > 0,
    canProceedToRuntimeInstall: ready, dockerRuntimeVerified: false }));
  process.exitCode = ready ? 0 : 1;
} catch {
  console.log(JSON.stringify({ status: 'CHECK_UNAVAILABLE', canProceedToRuntimeInstall: false, dockerRuntimeVerified: false }));
  process.exitCode = 1;
}
