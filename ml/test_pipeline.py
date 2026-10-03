"""Tests use synthetic pictures solely to verify splitting/export code, never as crop evidence."""
import tempfile
import unittest
from pathlib import Path
import numpy as np
from PIL import Image
from prepare_dataset import prepare, normalize

class PreparationTest(unittest.TestCase):
    def test_original_split_is_disjoint_and_augmented_files_are_excluded(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            rng = np.random.default_rng(42)
            for label in ['healthy', 'brown_rot']:
                (root / 'baseline' / label).mkdir(parents=True)
                (root / 'augmented' / label).mkdir(parents=True)
                for i in range(35):
                    Image.fromarray(rng.integers(0, 255, (80, 80, 3), dtype=np.uint8)).save(root / 'baseline' / label / f'{i}.png')
                Image.open(root / 'baseline' / label / '0.png').save(root / 'baseline' / label / 'copy.png')
                Image.open(root / 'baseline' / label / '0.png').save(root / 'augmented' / label / 'fake.png')
            manifest = prepare(root, root / 'output', ['healthy', 'brown_rot'])
            splits = [set(i['sha256'] for i in items) for items in manifest['splits'].values()]
            self.assertFalse(splits[0] & splits[1]); self.assertFalse(splits[0] & splits[2]); self.assertFalse(splits[1] & splits[2])
            self.assertEqual(manifest['duplicatesRemoved'], 2)
            self.assertEqual(manifest['augmentedFilesSkipped'], 2)
    def test_real_folder_spelling_aliases(self):
        self.assertEqual(normalize('gummosis_and_galls'), 'gumosis_and_galls')
        self.assertEqual(normalize('other_disorder_ e.g_water_stress'), 'other_disorder_e_g_water_stress')

if __name__ == '__main__': unittest.main()
