// Preserve the successful Expo artifact locally, beyond the build link's lifetime.
import fs from 'node:fs';
const info = JSON.parse(fs.readFileSync('tmp/eas-build-current.json', 'utf8').replace(/^\uFEFF/, ''));
if (info.status !== 'FINISHED' || !info.artifacts?.buildUrl) throw new Error('A successful APK build is required');
const response = await fetch(info.artifacts.buildUrl);
if (!response.ok) throw new Error(`APK download failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('Expected an APK/ZIP artifact');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/Berqo-Field-Scout.apk', bytes);
fs.writeFileSync('dist/build.json', JSON.stringify({ id: info.id, apkUrl: info.artifacts.buildUrl, bytes: bytes.length, builtAt: info.completedAt,
  appVersion: info.appVersion, appBuildVersion: info.appBuildVersion, expiresAt: info.expirationDate }, null, 2));
console.log(`Saved dist/Berqo-Field-Scout.apk (${bytes.length} bytes), build ${info.id}`);
