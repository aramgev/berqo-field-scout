"""Generate the jury download QR from the verified current release metadata."""
import json
from pathlib import Path
from PIL import Image
from reportlab.graphics.barcode.qr import QrCodeWidget

root = Path(__file__).resolve().parents[1]
release = json.loads((root / 'dist/build.json').read_text())
config = json.loads((root / 'app.json').read_text())['expo']
if release['appVersion'] != config['version']:
    raise ValueError('Download the current release before making its QR')
qr = QrCodeWidget(release['apkUrl']).qr
qr.make()
count = len(qr.modules)
border, scale = 4, 14
image = Image.new('RGB', ((count + border * 2) * scale,) * 2, 'white')
for y, row in enumerate(qr.modules):
    for x, module in enumerate(row):
        if module:
            image.paste('black', ((x + border) * scale, (y + border) * scale, (x + border + 1) * scale, (y + border + 1) * scale))
image.save(root / 'dist/Berqo-Download-QR.png')
print(f'Download QR updated for Berqo {config["version"]}')
