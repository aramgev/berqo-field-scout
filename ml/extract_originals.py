"""Safely extract original/baseline photos only from the downloaded official archive."""
import argparse
import shutil
import zipfile
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--archive', default='AgriVision-Apricot.zip')
parser.add_argument('--output', default='ml/datasets')
args = parser.parse_args()
destination = Path(args.output).resolve()
destination.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.archive) as archive:
    files = [item for item in archive.infolist() if not item.is_dir() and 'baseline' in item.filename.lower()
             and not any('augment' in part.lower() for part in Path(item.filename).parts)]
    total = sum(item.file_size for item in files)
    if not files or total > 20_000_000_000: raise ValueError('No originals found or unexpectedly large archive')
    for index, item in enumerate(files):
        path = Path(item.filename)
        target = (destination / path).resolve()
        if path.is_absolute() or '..' in path.parts or not target.is_relative_to(destination): raise ValueError('Unsafe archive path')
        if target.exists() and target.stat().st_size == item.file_size: continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(item) as source, target.open('wb') as output:
            shutil.copyfileobj(source, output)
        if index % 100 == 0: print(f'Extracted {index + 1}/{len(files)}', flush=True)
    print(f'Extracted {len(files)} baseline files ({total / 1e9:.2f} GB) into {destination}', flush=True)
