/**
 * Chromium's --no-sandbox overrides BrowserWindow's sandbox:true.
 * Refuse to open sensitive agent traces when a launch wrapper disables it.
 */
const UNSAFE_SWITCHES = ['no-sandbox', 'disable-sandbox'] as const;

export function sandboxBypassRequested(
  argv: readonly string[],
  hasSwitch: (name: string) => boolean = () => false,
): boolean {
  return UNSAFE_SWITCHES.some(name => hasSwitch(name)
    || argv.some(arg => arg === `--${name}` || arg.startsWith(`--${name}=`)));
}

export function assertSandboxEnabled(
  argv: readonly string[],
  hasSwitch: (name: string) => boolean = () => false,
): void {
  if (sandboxBypassRequested(argv, hasSwitch)) {
    throw new Error(
      'Agent Monitor refuses to start without the Chromium sandbox. '
      + 'Remove --no-sandbox / --disable-sandbox and enable Linux user namespaces. '
      + 'Do not bypass this check when viewing sensitive agent traces.',
    );
  }
}
