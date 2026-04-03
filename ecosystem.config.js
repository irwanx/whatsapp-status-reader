const argv = process.argv.slice(2);
const nameIndex = argv.indexOf("--name");
const appName =
  nameIndex !== -1 && argv[nameIndex + 1] ? argv[nameIndex + 1] : "wsr";

module.exports = {
  apps: [
    {
      name: appName,
      script: "node_modules/.bin/pnpm",
      args: "start",
      cwd: ".",
      wait_ready: false,
      autorestart: true,
      restart_delay: 10000,
      max_restarts: 5,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
