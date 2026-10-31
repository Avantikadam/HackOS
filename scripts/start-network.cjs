const os = require('os');
const net = require('net');
const { spawn } = require('child_process');

const PORT = 5173;

/**
 * Detects private IPv4 addresses across network adapters
 */
function getNetworkIps() {
  const nets = os.networkInterfaces();
  const results = [];

  for (const name of Object.keys(nets)) {
    const list = nets[name] || [];
    for (const netInfo of list) {
      const family = typeof netInfo.family === 'string' ? netInfo.family : `IPv${netInfo.family}`;
      if (family === 'IPv4' && !netInfo.internal) {
        const addr = netInfo.address;
        const isPrivate =
          addr.startsWith('192.168.') ||
          addr.startsWith('10.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(addr);

        if (isPrivate) {
          results.push({ name, address: addr });
        }
      }
    }
  }

  // Sort: prefer Wi-Fi or Ethernet first
  results.sort((a, b) => {
    const aScore = /wi-?fi|wlan|ethernet|eth|en0/i.test(a.name) ? 2 : 1;
    const bScore = /wi-?fi|wlan|ethernet|eth|en0/i.test(b.name) ? 2 : 1;
    return bScore - aScore;
  });

  return results;
}

/**
 * Checks if a TCP port is currently free
 */
function checkPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(true);
      }
    });
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '0.0.0.0');
  });
}

async function main() {
  const ips = getNetworkIps();
  const primary = ips.length > 0 ? ips[0].address : '127.0.0.1';

  const isFree = await checkPortFree(PORT);
  if (!isFree) {
    console.error(`\n❌ [HACKOS] Port ${PORT} is occupied by another process.`);
    console.error(`   strictPort is enabled to prevent silently switching ports.`);
    console.error(`   Please terminate the existing process using port ${PORT} and retry.\n`);
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('                     HACKOS IS RUNNING');
  console.log('============================================================');
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: http://${primary}:${PORT}`);
  if (ips.length > 1) {
    console.log('\n  Available Network Interfaces:');
    ips.forEach((iface, idx) => {
      console.log(`    • ${iface.name}: http://${iface.address}:${PORT}${idx === 0 ? ' (Active LAN)' : ''}`);
    });
  }
  console.log('\n  📱 Connect your phone or tablet to the same Wi-Fi and open:');
  console.log(`     👉 http://${primary}:${PORT}`);
  console.log('============================================================\n');

  // Spawn Vite with host and port
  const viteCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(viteCmd, ['vite', '--host', '0.0.0.0', '--port', String(PORT), '--strictPort'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

main().catch((err) => {
  console.error('[HACKOS] Network startup error:', err);
  process.exit(1);
});
