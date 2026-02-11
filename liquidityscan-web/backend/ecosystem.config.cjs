/**
 * PM2 config for LiquidityScan API (NestJS backend).
 * On server: cd liquidityscan-web/backend && npm run build && pm2 start ecosystem.config.cjs
 */
const path = require('path');

// NestJS build: main.js может быть в dist/ или в dist/src/
const distMain = path.join(__dirname, 'dist', 'main.js');
const distSrcMain = path.join(__dirname, 'dist', 'src', 'main.js');
const scriptPath = require('fs').existsSync(distMain) ? distMain : distSrcMain;

module.exports = {
  apps: [
    {
      name: 'liquidityscan-api',
      script: scriptPath,
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      max_memory_restart: '500M',
      autorestart: true,
      watch: false,
    },
  ],
};
