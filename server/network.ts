import os from 'os';

const SKIP_IFACE = /^(lo|utun|bridge|awdl|llw|gif|stf|vboxnet|vmnet|docker)/i;
const PREFERRED = ['en0', 'en1', 'wlan0', 'eth0'];

export function getLocalIPs(): string[] {
  const interfaces = os.networkInterfaces();
  const candidates: { address: string; priority: number }[] = [];

  for (const [name, ifaces] of Object.entries(interfaces)) {
    if (SKIP_IFACE.test(name)) continue;

    for (const iface of ifaces ?? []) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (iface.address.startsWith('169.254.')) continue;

      let priority = 50;
      const prefIdx = PREFERRED.indexOf(name);
      if (prefIdx >= 0) priority = prefIdx;
      else if (name.startsWith('en')) priority = 5;

      candidates.push({ address: iface.address, priority });
    }
  }

  candidates.sort((a, b) => a.priority - b.priority);
  return [...new Set(candidates.map((c) => c.address))];
}

export function getLocalIP(): string {
  return getLocalIPs()[0] ?? 'localhost';
}
