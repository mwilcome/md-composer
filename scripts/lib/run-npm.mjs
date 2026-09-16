import { spawnSync } from 'node:child_process';

export function runNpm(args, opts = {}) {
  if (process.platform === 'win32') {
    const quoted = args.map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg)).join(' ');
    return spawnSync('cmd.exe', ['/d', '/s', '/c', `npm.cmd ${quoted}`], {
      encoding: 'utf8',
      ...opts,
    });
  }
  return spawnSync('npm', args, { encoding: 'utf8', ...opts });
}
