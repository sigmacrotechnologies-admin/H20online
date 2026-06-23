/**
 * PM2 process config for production (run from repo root or backend folder).
 *   pm2 start ecosystem.config.cjs
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
      args: "vite preview --port 3000 --host 0.0.0.0",
      instances: 1,
      exec_mode: "fork",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
