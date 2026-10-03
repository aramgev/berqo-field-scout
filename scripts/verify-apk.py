"""Check the delivered APK contains the exact trained assets and native ARM64 runtime."""
import hashlib
import json
import struct
from pathlib import Path
import zipfile

apk = Path('dist/Berqo-Field-Scout.apk')
with zipfile.ZipFile(apk) as archive:
    bad = archive.testzip()
    if bad:
        raise RuntimeError(f'Corrupt APK entry: {bad}')
    verified = {}
    for filename in ('apricot.onnx', 'metadata.txt'):
        asset = Path('assets/models') / filename
        expected = hashlib.sha256(asset.read_bytes()).hexdigest()
        matches = [entry for entry in archive.infolist() if entry.file_size == asset.stat().st_size
                   and hashlib.sha256(archive.read(entry)).hexdigest() == expected]
        if not matches:
            raise RuntimeError(f'Trained asset missing from APK: {filename}')
        verified[filename] = {'apkEntry': matches[0].filename, 'sha256': expected}
    for library in ('libonnxruntime.so', 'libonnxruntimejsi.so'):
        entry = f'lib/arm64-v8a/{library}'
        if entry not in archive.namelist():
            raise RuntimeError(f'Native runtime missing: {entry}')
    with apk.open('rb') as raw:
        for entry in archive.infolist():
            if not entry.filename.startswith('lib/arm64-v8a/') or not entry.filename.endswith('.so'):
                continue
            binary = archive.read(entry)
            offset = struct.unpack_from('<Q', binary, 32)[0]
            size, count = struct.unpack_from('<HH', binary, 54)
            for index in range(count):
                header = offset + index * size
                if struct.unpack_from('<I', binary, header)[0] == 1 and struct.unpack_from('<Q', binary, header + 48)[0] < 16384:
                    raise RuntimeError(f'ARM64 ELF load segment is not 16 KB aligned: {entry.filename}')
            raw.seek(entry.header_offset + 26)
            name_length, extra_length = struct.unpack('<HH', raw.read(4))
            data_offset = entry.header_offset + 30 + name_length + extra_length
            if entry.compress_type == zipfile.ZIP_STORED and data_offset % 16384:
                raise RuntimeError(f'ARM64 APK library entry is not 16 KB aligned: {entry.filename}')
    if 'assets/index.android.bundle' not in archive.namelist():
        raise RuntimeError('Standalone JavaScript bundle missing')
    report = {'apkBytes': apk.stat().st_size, 'apkSha256': hashlib.sha256(apk.read_bytes()).hexdigest(),
              'verifiedAssets': verified, 'arm64NativeRuntime': True, 'standaloneJsBundle': True,
              'arm64ElfLoadAndZipAlignment16k': True,
              'phoneAcceptance': 'not assessed by this artifact check; see docs/VALIDATION.md'}
    Path('dist/verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report, indent=2))
