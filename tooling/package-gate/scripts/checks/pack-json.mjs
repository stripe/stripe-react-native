/**
 * First package report in `npm pack --json` stdout.
 * npm and Yarn may print an info line (`ℹ [module] ...`) before the JSON.
 * npm 10 prints an array, npm 11+ an object keyed by package name.
 * The JSON value must run through the end of stdout.
 */
export function firstPackReport(stdout, missingMessage) {
  const jsonStart = stdout.search(/^[ \t]*[\[{]/m);
  if (jsonStart === -1) {
    throw new Error(`${missingMessage}\n${stdout}`);
  }
  const parsed = JSON.parse(stdout.slice(jsonStart));
  return Array.isArray(parsed) ? parsed[0] : Object.values(parsed)[0];
}
