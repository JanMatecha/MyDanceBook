import { spawn } from 'node:child_process';

import { createNpmScriptCommand } from './npm-script-command.mjs';

function startNpmScript(script) {
  const command = createNpmScriptCommand({
    script,
    platform: process.platform,
    comSpec: process.env.ComSpec,
  });
  return spawn(command.executable, command.args, { stdio: 'inherit' });
}

const children = [startNpmScript('dev:server'), startNpmScript('dev:frontend')];

let stopping = false;

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;

  for (const child of children) {
    child.kill();
  }

  process.exitCode = exitCode;
}

for (const child of children) {
  child.on('exit', (code, signal) => {
    if (!stopping) {
      const reason = signal ? `signal ${signal}` : `code ${code ?? 1}`;
      console.error(`Development process stopped with ${reason}.`);
      stop(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
