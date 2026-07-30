/**
 * PM2 process file for the UMNAAPP backend API.
 * Usage: pm2 startOrReload ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: 'umnaapp-backend',
      script: 'server.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
