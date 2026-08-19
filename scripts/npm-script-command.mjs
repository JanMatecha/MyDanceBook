export function createNpmScriptCommand({ script, platform, comSpec }) {
  if (platform === 'win32') {
    return {
      executable: comSpec?.trim() || 'cmd.exe',
      args: ['/d', '/s', '/c', `npm.cmd run ${script}`],
    };
  }

  return {
    executable: 'npm',
    args: ['run', script],
  };
}
