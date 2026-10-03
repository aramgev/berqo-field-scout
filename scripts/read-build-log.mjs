// Read Expo's build metadata without printing its temporary signed log URL.
import fs from 'node:fs';
import zlib from 'node:zlib';
const info = JSON.parse(fs.readFileSync('tmp/eas-build-current.json', 'utf8').replace(/^\uFEFF/, ''));
console.log(`Build ${info.id}: ${info.status}`);
if (info.artifacts?.buildUrl) console.log(`APK: ${info.artifacts.buildUrl}`);
if (!info.logFiles?.length) process.exit(0);
const response = await fetch(info.logFiles.at(-1));
if (!response.ok) throw new Error(`Log download failed: ${response.status}`);
let bytes = Buffer.from(await response.arrayBuffer());
// fetch normally decodes HTTP compression automatically.
let contents = bytes.toString('utf8');
if (!contents.trimStart().startsWith('{')) {
  try { bytes = zlib.brotliDecompressSync(bytes); contents = bytes.toString('utf8'); } catch {}
}
fs.writeFileSync('tmp/native-build-current.log', contents);
const rows = contents.split('\n').filter(Boolean).map(line => { try { return JSON.parse(line); } catch { return { msg: line }; } });
const visible = rows.map(row => row.msg ?? row.message ?? JSON.stringify(row))
  .filter(message => !/^(w:|Note:|C\/C\+\+:)/.test(message) || /error:|fatal error/i.test(message));
for (const message of visible.slice(-15)) console.log(message);
