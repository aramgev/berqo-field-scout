"""Export the maintained Markdown source with vector diagrams and selectable text.

Run with a Python environment containing reportlab. No mobile dependencies added.
"""
from pathlib import Path
import html
import json
import re
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Flowable, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output/pdf/Berqo_Technical_Architecture.pdf'
INK = '#193B2B'
GREEN = '#285B3E'
PALE = '#EDF2E7'
PAPER = '#F7F5EF'
MUTED = '#69776D'
WIDTH = 483
DOCUMENT_DATE = ''

# Shared diagram definitions drive both the SVG source illustrations and the PDF.
# Coordinates use a top-left origin. Box labels remain selectable PDF text.
DIAGRAMS = {
    'system': (242, [
        (0, 0, 483, 38, 'Expo Router screens | English + Armenian'),
        (0, 56, 483, 38, 'FieldScoutProvider | actions, state and readiness'),
        (0, 112, 483, 38, 'Domain | observations, safety gates, risk rules, sync'),
        (0, 180, 148, 54, 'ONNX adapter\nNative CPU model'),
        (167, 180, 148, 54, 'Storage adapter\nLocal JSON + JPEG'),
        (334, 180, 149, 54, 'GPS + weather adapters\nOpen-Meteo HTTP'),
    ], [(0, 1), (1, 2), (2, 3), (2, 4), (2, 5)],
        'Figure 1. Three runtime paths: on-device inference, local persistence, and coordinate-only weather requests.'),
    'inference': (218, [
        (0, 0, 145, 58, '1. Photo input\nGallery or camera'),
        (169, 0, 145, 58, '2. Evidence JPEG\nPreserve aspect ratio'),
        (338, 0, 145, 58, '3. Model tensor\n224 x 224 RGB'),
        (338, 134, 145, 58, '4. MobileNetV3 Small\nONNX native CPU'),
        (169, 134, 145, 58, '5. Score + margin gate\nPossible or uncertain'),
        (0, 134, 145, 58, '6. Field Passport\nPhoto + note + JSON'),
    ], [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)],
        'Figure 2. The photo path stays on the phone. Model input resize is separate from saved evidence.'),
    'training': (218, [
        (0, 0, 145, 58, '1. Baseline images\nFour apricot classes'),
        (169, 0, 145, 58, '2. Deduplicate + split\nTrain / val / test'),
        (338, 0, 145, 58, '3. Transfer learning\nMobileNetV3 Small'),
        (338, 134, 145, 58, '4. Validate + export\nFloat32 ONNX'),
        (169, 134, 145, 58, '5. Verify crop pack\nMetadata + metrics'),
        (0, 134, 145, 58, '6. Bundle or import\nOffline Android app'),
    ], [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)],
        'Figure 3. Training runs on a development machine or Colab. The APK receives only the exported crop pack.'),
    'weather': (218, [
        (0, 0, 145, 58, '1. User requests GPS\nForeground permission'),
        (169, 0, 145, 58, '2. Save location fix\nSource + accuracy + time'),
        (338, 0, 145, 58, '3. Coordinate request\nOpen-Meteo / internet'),
        (338, 134, 145, 58, '4. Parse + cache\nHourly UTC / local days'),
        (169, 134, 145, 58, '5. Forecast display\n3 days + upcoming hours'),
        (0, 134, 145, 58, '6. 48-hour suggestions\nFrost / rain / soil check'),
    ], [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5)],
        'Figure 4. Cached forecasts remain accessible offline; suggestions stop after 24 hours without refresh.'),
}

def anchors(a, b):
    ax, ay, aw, ah, _ = a
    bx, by, bw, bh, _ = b
    if abs(ay - by) < 1:
        return ((ax + aw, ay + ah / 2), (bx, by + bh / 2)) if bx > ax else ((ax, ay + ah / 2), (bx + bw, by + bh / 2))
    return ((ax + aw / 2, ay + ah), (bx + bw / 2, by))

def write_svg(name, spec):
    height, nodes, edges, _ = spec
    lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {WIDTH} {height}" role="img" aria-label="{html.escape(name)} architecture diagram">',
             f'<rect width="{WIDTH}" height="{height}" fill="white"/>',
             f'<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="{GREEN}"/></marker></defs>']
    for start, end in edges:
        (x1, y1), (x2, y2) = anchors(nodes[start], nodes[end])
        lines.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{GREEN}" stroke-width="1.3" marker-end="url(#arrow)"/>')
    for x, y, w, h, label in nodes:
        lines.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="7" fill="{PALE}" stroke="#CDD7C8"/>')
        parts = label.split('\n')
        for i, part in enumerate(parts):
            baseline = y + h / 2 - (len(parts) - 1) * 7 + i * 14 + 3
            lines.append(f'<text x="{x + w / 2}" y="{baseline}" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" fill="{INK}">{html.escape(part)}</text>')
    lines.append('</svg>')
    directory = ROOT / 'docs/diagrams'
    directory.mkdir(parents=True, exist_ok=True)
    (directory / f'{name}.svg').write_text('\n'.join(lines), encoding='utf-8')

class Diagram(Flowable):
    def __init__(self, name):
        super().__init__()
        self.spec = DIAGRAMS[name]
        self.width, self.height = WIDTH, self.spec[0]
    def draw(self):
        c = self.canv
        height, nodes, edges, _ = self.spec
        c.setStrokeColor(colors.HexColor(GREEN))
        c.setFillColor(colors.HexColor(GREEN))
        c.setLineWidth(1.1)
        for start, end in edges:
            (x1, y1), (x2, y2) = anchors(nodes[start], nodes[end])
            c.line(x1, height - y1, x2, height - y2)
            dx, dy = x2 - x1, -(y2 - y1)
            length = (dx * dx + dy * dy) ** .5
            ux, uy = dx / length, dy / length
            px, py = -uy, ux
            x, y = x2, height - y2
            path = c.beginPath(); path.moveTo(x, y)
            path.lineTo(x - 7 * ux + 3 * px, y - 7 * uy + 3 * py)
            path.lineTo(x - 7 * ux - 3 * px, y - 7 * uy - 3 * py)
            path.close(); c.drawPath(path, fill=1, stroke=0)
        for x, y, w, h, label in nodes:
            c.setFillColor(colors.HexColor(PALE)); c.setStrokeColor(colors.HexColor('#CDD7C8'))
            c.roundRect(x, height - y - h, w, h, 7, fill=1, stroke=1)
            p = Paragraph(html.escape(label).replace('\n', '<br/>'), DIAGRAM_TEXT)
            _, text_height = p.wrap(w - 12, h)
            p.drawOn(c, x + 6, height - y - h + (h - text_height) / 2)

def inline(text):
    safe = html.escape(text)
    safe = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', safe)
    safe = re.sub(r'`([^`]+)`', r'<font name="Courier">\1</font>', safe)
    return re.sub(r'https://[^\s<>]+', lambda m: f'<link href="{m.group(0)}" color="{GREEN}">{m.group(0)}</link>', safe)

for name, path in [('BerqoBody', 'arial.ttf'), ('BerqoBold', 'arialbd.ttf')]:
    pdfmetrics.registerFont(TTFont(name, str(Path('C:/Windows/Fonts') / path)))
pdfmetrics.registerFontFamily('BerqoBody', normal='BerqoBody', bold='BerqoBold', italic='BerqoBody', boldItalic='BerqoBold')
BODY = ParagraphStyle('Body', fontName='BerqoBody', fontSize=10.2, leading=14.7, textColor=colors.HexColor(INK), spaceAfter=9)
HEADING = ParagraphStyle('Heading', parent=BODY, fontName='BerqoBold', fontSize=17, leading=21, spaceBefore=20, spaceAfter=11, keepWithNext=True)
CAPTION = ParagraphStyle('Caption', parent=BODY, fontSize=8.5, leading=12, textColor=colors.HexColor(MUTED), spaceAfter=12)
DIAGRAM_TEXT = ParagraphStyle('Diagram', parent=BODY, fontSize=9.2, leading=13, alignment=TA_CENTER, spaceAfter=0)
BULLET = ParagraphStyle('Bullet', parent=BODY, leftIndent=12, firstLineIndent=-9, spaceAfter=5)

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor('#DDE4D8')); canvas.line(56, 43, 539, 43)
    canvas.setFont('BerqoBody', 8); canvas.setFillColor(colors.HexColor(MUTED))
    canvas.drawString(56, 29, f'BERQO | Technical architecture | {DOCUMENT_DATE}')
    canvas.drawRightString(539, 29, str(doc.page))
    canvas.restoreState()

def export():
    global DOCUMENT_DATE
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    for name, spec in DIAGRAMS.items(): write_svg(name, spec)
    config = json.loads((ROOT / 'app.json').read_text(encoding='utf-8'))['expo']
    model = json.loads((ROOT / 'assets/models/metadata.txt').read_text(encoding='utf-8'))
    source = (ROOT / 'docs/TECHNICAL_ARCHITECTURE.md').read_text(encoding='utf-8')
    DOCUMENT_DATE = re.search(r'Updated: ([^,]+), Asia/Yerevan', source).group(1)
    if f"Application version: {config['version']}" not in source:
        raise ValueError('Update the architecture source version to match app.json before exporting')
    if f"Bundled crop-pack version: {model['version']}" not in source:
        raise ValueError('Update the architecture source crop-pack version before exporting')
    story = [Spacer(1, 28)]
    # The original logo is embedded without producing or modifying a raster asset.
    from reportlab.platypus import Image
    story += [Image(str(ROOT / 'assets/berqo-logo.png'), width=180, height=180, hAlign='LEFT'), Spacer(1, 24),
              Paragraph('Berqo', ParagraphStyle('Cover', parent=HEADING, fontSize=40, leading=45)),
              Paragraph('Technical architecture', ParagraphStyle('CoverSub', parent=HEADING, fontSize=26, leading=32)),
              Paragraph('Apricot Field Scout<br/>Standalone hackathon MVP<br/>Android-first React Native', BODY), Spacer(1, 28),
              Paragraph(f"Application {config['version']} | Crop pack {model['version']}<br/>{DOCUMENT_DATE} | Asia/Yerevan", BODY),
              Spacer(1, 25), Paragraph('On-device image inference. Persistent field evidence.<br/>Foreground location and cached weather.<br/>Replaceable adapters for future Berqo integration.', BODY),
              Spacer(1, 20), Paragraph('A maintained technical source for reviewers and NotebookLM. Implemented features, measured evidence, pending checks and future work are explicitly distinguished.', CAPTION), PageBreak()]
    blocks = [block.strip() for block in source.split('\n\n')]
    consumed = set()
    for index, block in enumerate(blocks):
        if index in consumed: continue
        block = block.strip()
        if not block or block.startswith('# ') or block.startswith('Apricot Field Scout |'): continue
        if block.startswith('## '):
            heading = Paragraph(inline(block[3:]), HEADING)
            if index + 1 < len(blocks) and blocks[index + 1].startswith('!['):
                name = re.search(r'diagrams/(\w+)\.svg', blocks[index + 1]).group(1)
                story.append(KeepTogether([heading, Diagram(name), Spacer(1, 5), Paragraph(DIAGRAMS[name][3], CAPTION)]))
                consumed.add(index + 1)
            else: story.append(heading)
            continue
        if block.startswith('!['):
            name = re.search(r'diagrams/(\w+)\.svg', block).group(1)
            story.append(KeepTogether([Diagram(name), Spacer(1, 5), Paragraph(DIAGRAMS[name][3], CAPTION)])); continue
        if block.startswith('- '):
            for line in block.splitlines(): story.append(Paragraph('&#8226; ' + inline(line.removeprefix('- ')), BULLET))
            continue
        story.append(Paragraph(inline(' '.join(block.splitlines())), BODY))
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=(595.28, 841.89), leftMargin=56, rightMargin=56,
                            topMargin=48, bottomMargin=62, title='Berqo: Technical Architecture', author='Berqo project',
                            subject='Offline apricot inspection, model training, phone location, forecasts and integration')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(f'Exported {OUTPUT}')

if __name__ == '__main__': export()
