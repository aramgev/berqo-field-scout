"""Fetch official Google platform tools for authorized physical-phone diagnostics."""
from pathlib import Path
import hashlib
import io
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

base = 'https://dl.google.com/android/repository/'
root = ET.fromstring(urllib.request.urlopen(base + 'repository2-1.xml', timeout=30).read())
package = next(p for p in root if p.attrib.get('path') == 'platform-tools')
archive = next(a for a in package.find('archives') if a.findtext('host-os') == 'windows')
complete = archive.find('complete')
payload = urllib.request.urlopen(base + complete.findtext('url'), timeout=90).read()
if hashlib.sha1(payload).hexdigest() != complete.findtext('checksum'):
    raise RuntimeError('Official package checksum mismatch')
directory = Path('tmp/adb')
directory.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(io.BytesIO(payload)) as z:
    for target in ('adb.exe', 'AdbWinApi.dll', 'AdbWinUsbApi.dll'):
        (directory / target).write_bytes(z.read('platform-tools/' + target))
print('Official Google ADB tools ready')
