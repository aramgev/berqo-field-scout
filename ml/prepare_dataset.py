"""Prepare original apricot images, deduplicate before splitting, preserve a held-out test set."""
import argparse
import hashlib
import json
import random
import re
from collections import Counter, defaultdict
from pathlib import Path
from PIL import Image, ImageOps

SUPPORTED = {'healthy', 'brown_rot', 'shot_hole_leaves', 'shot_hole_fruit', 'powdery_mildew',
             'dieback', 'gumosis_and_galls', 'other_disorder_e_g_water_stress', 'wilting', 'unknown'}
DEFAULT_CLASSES = 'healthy,brown_rot,shot_hole_leaves,shot_hole_fruit'

def normalize(value):
    normalized = re.sub(r'[^a-z0-9]+', '_', value.lower()).strip('_')
    return {'gummosis_and_galls': 'gumosis_and_galls'}.get(normalized, normalized)

def label_for(path, root, classes):
    for folder in reversed(path.relative_to(root).parts[:-1]):
        normalized = normalize(folder)
        if normalized in classes:
            return normalized
    return None

def fingerprint(path):
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert('RGB')
        if min(image.size) < 64:
            raise ValueError('Image smaller than 64 pixels')
        exact = hashlib.sha256(image.tobytes() + str(image.size).encode()).hexdigest()
        pixels = list(image.convert('L').resize((9, 8)).getdata())
        perceptual = sum((pixels[y * 9 + x] > pixels[y * 9 + x + 1]) << (y * 8 + x)
                         for y in range(8) for x in range(8))
        return exact, perceptual

def prepare(root, output, classes, min_count=30, seed=42):
    root, output = Path(root).resolve(), Path(output).resolve()
    if not root.is_dir():
        raise ValueError(f'Dataset directory does not exist: {root}')
    if not set(classes) <= SUPPORTED or len(set(classes)) != len(classes) or len(classes) < 2:
        raise ValueError('Use at least two distinct supported apricot classes')
    output.mkdir(parents=True, exist_ok=True)
    images = []
    exact_seen, perceptual_seen = {}, {}
    duplicates, rejected, augmented = 0, [], 0
    for path in sorted(root.rglob('*')):
        if path.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp', '.bmp'}:
            continue
        if any('augment' in part.lower() for part in path.relative_to(root).parts):
            augmented += 1
            continue
        label = label_for(path, root, classes)
        if label is None:
            continue
        try:
            exact, phash = fingerprint(path)
            previous = exact_seen.get(exact) or perceptual_seen.get(phash)
            if previous:
                if previous != label:
                    raise ValueError(f'Conflicting duplicate labels: {previous} / {label}')
                duplicates += 1
                continue
            exact_seen[exact] = label
            perceptual_seen[phash] = label
            # Cache lossless resized originals once so CPU training does not decode multi-MB photos every epoch.
            cached = output / 'prepared' / label / f'{exact}.png'
            cached.parent.mkdir(parents=True, exist_ok=True)
            if not cached.exists():
                with Image.open(path) as source:
                    ImageOps.exif_transpose(source).convert('RGB').resize((224, 224), Image.Resampling.BILINEAR).save(cached)
            images.append({'path': str(cached), 'originalPath': str(path), 'label': label, 'sha256': exact, 'dhash': str(phash)})
        except Exception as error:
            rejected.append({'path': str(path), 'error': str(error)})
    if any('Conflicting duplicate' in item['error'] for item in rejected):
        raise ValueError('Duplicate images have conflicting labels. Correct labels before training.')
    grouped = defaultdict(list)
    for item in images:
        grouped[item['label']].append(item)
    rng = random.Random(seed)
    splits = {'train': [], 'val': [], 'test': []}
    for label in classes:
        items = grouped[label]
        if len(items) < min_count:
            raise ValueError(f'{label}: only {len(items)} unique original images; need {min_count}. Select fewer classes or fix --data path.')
        rng.shuffle(items)
        holdout = max(3, round(len(items) * .15))
        splits['test'].extend(items[:holdout])
        splits['val'].extend(items[holdout:2 * holdout])
        splits['train'].extend(items[2 * holdout:])
    manifest = {'classes': classes, 'seed': seed, 'root': str(root), 'splits': splits,
                'counts': {name: dict(Counter(i['label'] for i in values)) for name, values in splits.items()},
                'duplicatesRemoved': duplicates, 'augmentedFilesSkipped': augmented, 'rejected': rejected,
                'limitations': ['Exact and identical difference-hash duplicates removed. Similar scenes from the same tree may remain. Group by orchard/tree before production validation.',
                                'Random image split is not an independent Armenian orchard evaluation.']}
    (output / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in manifest.items() if k not in {'splits', 'rejected'}}, indent=2))
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data', required=True)
    parser.add_argument('--output', default='ml/outputs')
    parser.add_argument('--classes', default=DEFAULT_CLASSES)
    parser.add_argument('--min-count', type=int, default=30)
    args = parser.parse_args()
    prepare(args.data, args.output, args.classes.split(','), args.min_count)
