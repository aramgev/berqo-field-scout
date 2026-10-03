"""Create the local jury handoff; never upload or send it automatically."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1]
def package():
    config = json.loads((ROOT / 'app.json').read_text())['expo']
    apk = ROOT / 'dist/Berqo-Field-Scout.apk'
    verification = json.loads((ROOT / 'dist/verification.json').read_text())
    build = json.loads((ROOT / 'dist/build.json').read_text())
    if build.get('appVersion') != config['version'] or str(build.get('appBuildVersion')) != str(config['android']['versionCode']):
        raise ValueError('Download and verify the current app version before packaging')
    if hashlib.sha256(apk.read_bytes()).hexdigest() != verification['apkSha256']:
        raise ValueError('Verify the current APK before packaging')
    files = {
        apk: f"Berqo-{config['version']}.apk",
        ROOT / 'output/pdf/Berqo_Technical_Architecture.pdf': 'Berqo_Technical_Architecture.pdf',
        ROOT / 'docs/TECHNICAL_ARCHITECTURE.md': 'TECHNICAL_ARCHITECTURE.md',
        ROOT / 'docs/NOTEBOOKLM_VIDEO_PROMPT.md': 'NOTEBOOKLM_VIDEO_PROMPT.md',
        ROOT / 'docs/JURY_SHARE.md': 'START_HERE.md',
        ROOT / 'dist/Berqo-Download-QR.png': 'Berqo-Download-QR.png',
        ROOT / 'assets/berqo-logo.png': 'berqo-logo.png',
        ROOT / 'assets/models/metrics.json': 'model-metrics.json',
    }
    for directory in ['docs/diagrams', 'demo']:
        for path in (ROOT / directory).rglob('*'):
            if path.is_file():
                files[path] = str(path.relative_to(ROOT / 'docs' if directory.startswith('docs') else ROOT)).replace('\\', '/')
    target = ROOT / 'dist/Berqo-Jury-Pack.zip'
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path, name in files.items(): archive.write(path, name)
        archive.writestr('APK-SHA256.txt', verification['apkSha256'] + f"  Berqo-{config['version']}.apk\n")
    with zipfile.ZipFile(target) as archive:
        if archive.testzip(): raise ValueError('Corrupt jury archive')
        print(f'Jury pack: {len(archive.namelist())} files, {target.stat().st_size:,} bytes')

if __name__ == '__main__': package()
