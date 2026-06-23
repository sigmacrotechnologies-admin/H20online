/**
 * PM2 process config for AWS production (run from repo root).
 *
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 *
 * Prerequisite: admin built with npm run build:prod (dist/ folder exists)
 */
module.exports = {
  apps: [
    {
      name: "h20-backend",
      cwd: "./backend",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
    {
      name: "h20-admin",
      cwd: "./admin",
      script: "npx",
      args: "serve dist 3000 --spa --listen 3000 --no-clipboard",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
