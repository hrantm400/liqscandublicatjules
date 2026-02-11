#!/usr/bin/env node

/**
 * Скрипт для освобождения порта
 * Использование: node scripts/kill-port.js [port]
 * По умолчанию: порт 3000
 */

const { exec } = require('child_process');
const port = process.argv[2] || '3000';

console.log(`🔍 Поиск процессов на порту ${port}...\n`);

// Для Windows используем netstat
if (process.platform === 'win32') {
  exec(`netstat -ano | findstr ":${port}"`, (error, stdout, stderr) => {
    if (error || !stdout) {
      console.log(`✅ Порт ${port} свободен`);
      return;
    }

    const lines = stdout.trim().split('\n');
    const pids = new Set();

    lines.forEach(line => {
      const match = line.match(/\s+(\d+)$/);
      if (match) {
        pids.add(match[1]);
      }
    });

    if (pids.size === 0) {
      console.log(`✅ Порт ${port} свободен`);
      return;
    }

    console.log(`⚠️  Найдены процессы на порту ${port}:`);
    pids.forEach(pid => {
      console.log(`   PID: ${pid}`);
    });

    console.log(`\n🛑 Остановка процессов...`);
    
    pids.forEach(pid => {
      exec(`taskkill /F /PID ${pid}`, (error) => {
        if (error) {
          console.log(`   ❌ Не удалось остановить процесс ${pid}`);
        } else {
          console.log(`   ✅ Процесс ${pid} остановлен`);
        }
      });
    });

    setTimeout(() => {
      console.log(`\n✅ Порт ${port} должен быть свободен`);
    }, 1000);
  });
} else {
  // Для Linux/Mac используем lsof
  exec(`lsof -ti:${port}`, (error, stdout) => {
    if (error || !stdout) {
      console.log(`✅ Порт ${port} свободен`);
      return;
    }

    const pids = stdout.trim().split('\n').filter(Boolean);
    
    console.log(`⚠️  Найдены процессы на порту ${port}:`);
    pids.forEach(pid => console.log(`   PID: ${pid}`));

    console.log(`\n🛑 Остановка процессов...`);
    
    pids.forEach(pid => {
      exec(`kill -9 ${pid}`, (error) => {
        if (error) {
          console.log(`   ❌ Не удалось остановить процесс ${pid}`);
        } else {
          console.log(`   ✅ Процесс ${pid} остановлен`);
        }
      });
    });

    setTimeout(() => {
      console.log(`\n✅ Порт ${port} должен быть свободен`);
    }, 1000);
  });
}
