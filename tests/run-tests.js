#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const commands = {
  all: {
    desc: '运行所有测试',
    args: ['test']
  },
  api: {
    desc: '运行API测试（认证、用户、表结构、申请）',
    args: ['test', 'tests/auth.spec.js', 'tests/users.spec.js', 'tests/tableSchemas.spec.js', 'tests/applications.spec.js']
  },
  e2e: {
    desc: '运行E2E测试',
    args: ['test', 'tests/e2e.spec.js']
  },
  db: {
    desc: '运行数据库测试',
    args: ['test', 'tests/database.spec.js']
  },
  auth: {
    desc: '运行认证测试',
    args: ['test', 'tests/auth.spec.js']
  },
  users: {
    desc: '运行用户管理测试',
    args: ['test', 'tests/users.spec.js']
  },
  tables: {
    desc: '运行表结构测试',
    args: ['test', 'tests/tableSchemas.spec.js']
  },
  applications: {
    desc: '运行申请表测试',
    args: ['test', 'tests/applications.spec.js']
  },
  ui: {
    desc: '以UI模式运行测试',
    args: ['test', '--ui']
  },
  headed: {
    desc: '在可见浏览器中运行测试',
    args: ['test', '--headed']
  },
  debug: {
    desc: '调试模式运行测试',
    args: ['test', '--debug']
  },
  report: {
    desc: '显示测试报告',
    args: ['show-report']
  },
  install: {
    desc: '安装Playwright浏览器',
    args: ['install', 'chromium']
  }
};

function printHelp() {
  console.log('\n📋 可用的测试命令：\n');
  
  Object.keys(commands).forEach(key => {
    const cmd = commands[key];
    console.log(`  npm run test:${key.padEnd(15)} ${cmd.desc}`);
  });
  
  console.log('\n示例：');
  console.log('  npm run test:api      # 运行所有API测试');
  console.log('  npm run test:e2e      # 运行E2E测试');
  console.log('  npm run test:ui       # 以UI模式运行测试\n');
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`命令退出码: ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }
  
  const testType = args[0];
  
  if (!commands[testType]) {
    console.error(`❌ 未知命令: ${testType}`);
    console.log();
    printHelp();
    process.exit(1);
  }
  
  const command = commands[testType];
  
  console.log(`🚀 开始${command.desc}...\n`);
  
  try {
    await runCommand('npx', command.args);
    console.log(`\n✅ ${command.desc}完成！`);
  } catch (error) {
    console.error(`\n❌ ${command.desc}失败:`, error.message);
    process.exit(1);
  }
}

main();
