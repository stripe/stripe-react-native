import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';

export function run(command, args, { cwd, env } = {}) {
  console.log(`  $ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

/**
 * Runs a command with its output written to `logFile` (and echoed when
 * `verbose`). On failure, prints the last lines of the log. `env` is the
 * complete environment.
 */
export function runLogged(command, args, { cwd, env, logFile, verbose }) {
  console.log(`  $ ${command} ${args.join(' ')}\n    log: ${logFile}`);
  const started = Date.now();
  return new Promise((resolve) => {
    const log = fs.createWriteStream(logFile, { flags: 'a' });
    log.write(`$ (cd ${cwd} && ${command} ${args.join(' ')})\n`);
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const forward = (chunk) => {
      log.write(chunk);
      if (verbose) process.stdout.write(chunk);
    };
    child.stdout.on('data', forward);
    child.stderr.on('data', forward);
    child.on('close', (code, signal) => {
      log.end(() => {
        const seconds = Math.round((Date.now() - started) / 1000);
        const status = code ?? 1;
        if (status !== 0) {
          const tail = fs
            .readFileSync(logFile, 'utf8')
            .split('\n')
            .slice(-60)
            .join('\n');
          console.error(
            `    failed after ${seconds}s (exit ${code ?? signal}); last lines of the log:\n${tail}`
          );
        } else {
          console.log(`    done in ${seconds}s`);
        }
        resolve(status);
      });
    });
  });
}
