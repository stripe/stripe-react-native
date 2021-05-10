const Launcher = require('@wdio/cli').default;

async function run() {
  const ios = process.argv.find((arg) => arg === 'ios');
  const path = ios ? './wdio.ios.js' : 'wdio.android.js';
  const wdio = new Launcher(path);
  wdio.run().then(
    (code) => {
      process.exit(code);
    },
    (error) => {
      console.error('Launcher failed to start the test', error.stacktrace);
      process.exit(1);
    }
  );
}

run();
