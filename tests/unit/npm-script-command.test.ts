import { describe, expect, it } from 'vitest';

import { createNpmScriptCommand } from '../../scripts/npm-script-command.mjs';

describe('npm development script command', () => {
  it('uses ComSpec to execute npm.cmd on Windows', () => {
    expect(
      createNpmScriptCommand({
        script: 'dev:server',
        platform: 'win32',
        comSpec: 'C:\\Windows\\System32\\cmd.exe',
      }),
    ).toEqual({
      executable: 'C:\\Windows\\System32\\cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd run dev:server'],
    });
  });

  it('falls back to cmd.exe on Windows when ComSpec is unavailable', () => {
    expect(
      createNpmScriptCommand({
        script: 'dev:frontend',
        platform: 'win32',
      }),
    ).toEqual({
      executable: 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm.cmd run dev:frontend'],
    });
  });

  it('executes npm directly on POSIX', () => {
    expect(
      createNpmScriptCommand({
        script: 'dev:server',
        platform: 'linux',
      }),
    ).toEqual({
      executable: 'npm',
      args: ['run', 'dev:server'],
    });
  });
});
