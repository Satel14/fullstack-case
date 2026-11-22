const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  enumerateItems, listImages, readManifest, registerImages, serializeManifest, wears, categoryMapping, IMAGES_PATH,
} = require('./enumerateItems');

const ORIGINAL_ITEM_COUNT = 1769;

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const positionalEnumeration = (keys) => {
  const tree = new Map();
  for (const key of keys) {
    const [category, weapon, file] = key.split('/');
    if (!tree.has(category)) tree.set(category, new Map());
    const weapons = tree.get(category);
    if (!weapons.has(weapon)) weapons.set(weapon, []);
    weapons.get(weapon).push(file);
  }
  const items = [];
  let itemId = 1;
  for (const category of [...tree.keys()].sort(byName)) {
    const weapons = tree.get(category);
    for (const weapon of [...weapons.keys()].sort(byName)) {
      const skins = weapons.get(weapon).sort(byName);
      for (let i = 0; i < skins.length; i++) {
        items.push({
          itemId,
          name: `${weapon} | ${skins[i].replace('.webp', '')}`,
          rare: wears[i % wears.length],
          type: categoryMapping[category] || 'unknown',
          colors: i % 3 === 0 ? 'painted' : 'default',
          imagePath: `/img/items/${category}/${weapon}/${skins[i]}`,
          category,
          weapon,
        });
        itemId++;
      }
    }
  }
  return items;
};

const makeTree = () => fs.mkdtempSync(path.join(os.tmpdir(), 'item-images-'));

const addImage = (root, key) => {
  const file = path.join(root, ...key.split('/'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '');
};

const withTree = (keys, run) => {
  const root = makeTree();
  try {
    keys.forEach((key) => addImage(root, key));
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
};

test('the manifest holds the positional ids of the original 1769 images, in their old order', () => {
  const manifest = readManifest();
  const original = Object.entries(manifest).filter(([, id]) => id <= ORIGINAL_ITEM_COUNT);
  const positional = positionalEnumeration(original.map(([key]) => key));

  assert.equal(original.length, ORIGINAL_ITEM_COUNT);
  assert.deepEqual(
    Object.fromEntries(original),
    Object.fromEntries(positional.map((item) => [item.imagePath.replace('/img/items/', ''), item.itemId])),
  );
});

test('the current image tree enumerates every original item exactly as the positional enumeration did', () => {
  const manifest = readManifest();
  const original = Object.keys(manifest).filter((key) => manifest[key] <= ORIGINAL_ITEM_COUNT);
  const positional = new Map(positionalEnumeration(original).map((item) => [item.itemId, item]));
  const current = enumerateItems().filter((item) => item.itemId <= ORIGINAL_ITEM_COUNT);

  assert.ok(current.length > 1000, `expected >1000 original items, got ${current.length}`);
  for (const item of current) {
    assert.deepEqual(item, positional.get(item.itemId));
  }
});

test('every image of the current tree is registered in the committed manifest', () => {
  const manifest = readManifest();
  assert.deepEqual(listImages().filter((key) => !Object.hasOwn(manifest, key)), []);
});

test('manifest ids are unique and items come out in ascending id order', () => {
  const ids = Object.values(readManifest());
  assert.equal(new Set(ids).size, ids.length);
  const itemIds = enumerateItems().map((i) => i.itemId);
  assert.deepEqual(itemIds, [...itemIds].sort((a, b) => a - b));
});

test('each item has a name "Weapon | Skin", a wear, and a type', () => {
  const item = enumerateItems()[0];
  assert.match(item.name, / \| /);
  assert.ok(['Factory New', 'Minimal wear', 'Field Tested', 'Well Worn', 'Battle Scarred'].includes(item.rare));
  assert.ok(item.type && item.type !== 'unknown');
});

test('knives (category Other) map to type "knife"', () => {
  const knife = enumerateItems().find((i) => i.category === 'Other');
  assert.equal(knife.type, 'knife');
});

test('the committed manifest file is exactly what serializeManifest writes', () => {
  const file = path.join(__dirname, '..', '..', 'src', 'constant', 'itemIds.json');
  assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), serializeManifest(readManifest()));
});

test('an image added in the middle of the sort order gets max+1 and every existing item stays as it was', () => {
  const start = ['Pistols/Glock-18/Alpha.webp', 'Pistols/Glock-18/Delta.webp', 'Rifles/AK-47/Redline.webp'];
  withTree(start, (root) => {
    const { manifest, added } = registerImages(listImages(root), {});
    assert.deepEqual(added, start);
    const before = enumerateItems(root, manifest);
    assert.deepEqual(before.map((i) => i.itemId), [1, 2, 3]);

    addImage(root, 'Pistols/Glock-18/Bravo.webp');
    const grown = registerImages(listImages(root), manifest);
    assert.deepEqual(grown.added, ['Pistols/Glock-18/Bravo.webp']);
    assert.equal(grown.manifest['Pistols/Glock-18/Bravo.webp'], 4);

    const after = enumerateItems(root, grown.manifest);
    assert.deepEqual(after.slice(0, 3), before);
    assert.deepEqual(after[3], {
      itemId: 4,
      name: 'Glock-18 | Bravo',
      rare: wears[2],
      type: categoryMapping.Pistols,
      colors: 'default',
      imagePath: '/img/items/Pistols/Glock-18/Bravo.webp',
      category: 'Pistols',
      weapon: 'Glock-18',
    });
  });
});

test('new images are numbered after the maximum in sort order, whatever order they were added in', () => {
  withTree(['Rifles/AK-47/Redline.webp'], (root) => {
    const { manifest } = registerImages(listImages(root), {});
    addImage(root, 'Rifles/M4A4/Howl.webp');
    addImage(root, 'Pistols/USP-S/Orion.webp');
    addImage(root, 'Rifles/AK-47/Asiimov.webp');

    const { manifest: grown, added } = registerImages(listImages(root), manifest);

    assert.deepEqual(added, ['Pistols/USP-S/Orion.webp', 'Rifles/AK-47/Asiimov.webp', 'Rifles/M4A4/Howl.webp']);
    assert.deepEqual(grown, {
      'Rifles/AK-47/Redline.webp': 1,
      'Pistols/USP-S/Orion.webp': 2,
      'Rifles/AK-47/Asiimov.webp': 3,
      'Rifles/M4A4/Howl.webp': 4,
    });
  });
});

test('a removed image keeps its id reserved: the others stay and the next image does not reuse it', () => {
  const start = ['Pistols/Glock-18/Alpha.webp', 'Pistols/Glock-18/Bravo.webp', 'Pistols/Glock-18/Charlie.webp'];
  withTree(start, (root) => {
    const { manifest } = registerImages(listImages(root), {});
    const before = enumerateItems(root, manifest);

    fs.unlinkSync(path.join(root, 'Pistols', 'Glock-18', 'Charlie.webp'));
    const withoutCharlie = registerImages(listImages(root), manifest);
    assert.deepEqual(withoutCharlie.added, []);
    assert.deepEqual(withoutCharlie.manifest, manifest);
    assert.deepEqual(enumerateItems(root, manifest), before.slice(0, 2));

    addImage(root, 'Pistols/Glock-18/Delta.webp');
    const grown = registerImages(listImages(root), manifest);
    assert.equal(grown.manifest['Pistols/Glock-18/Delta.webp'], 4);
    const delta = enumerateItems(root, grown.manifest).find((i) => i.itemId === 4);
    assert.equal(delta.rare, wears[3]);
  });
});

test('registerItemImages.js writes only new images into the manifest file and keeps removed ones', () => {
  const { recordNewImages } = require('../registerItemImages');
  withTree(['Pistols/Glock-18/Alpha.webp', 'Pistols/Glock-18/Charlie.webp'], (root) => {
    const manifestPath = path.join(root, 'itemIds.json');
    const committed = {
      'Pistols/Glock-18/Alpha.webp': 1,
      'Pistols/Glock-18/Gone.webp': 2,
      'Pistols/Glock-18/Charlie.webp': 3,
    };
    fs.writeFileSync(manifestPath, serializeManifest(committed));
    addImage(root, 'Pistols/Glock-18/Bravo.webp');
    const lines = [];
    const log = { log: (line) => lines.push(line) };

    assert.deepEqual(recordNewImages({ imagesPath: root, manifestPath, log }), ['Pistols/Glock-18/Bravo.webp']);
    assert.deepEqual(readManifest(manifestPath), { ...committed, 'Pistols/Glock-18/Bravo.webp': 4 });
    assert.match(lines.join('\n'), /1 ids have no image any more and stay reserved: Pistols\/Glock-18\/Gone\.webp/);
    assert.match(lines.join('\n'), /Commit src\/constant\/itemIds\.json/);

    const written = fs.readFileSync(manifestPath, 'utf8');
    assert.deepEqual(recordNewImages({ imagesPath: root, manifestPath, log }), []);
    assert.equal(fs.readFileSync(manifestPath, 'utf8'), written);
  });
});

test('an image without an id stops the enumeration, naming it', () => {
  withTree(['Pistols/Glock-18/Alpha.webp'], (root) => {
    const { manifest } = registerImages(listImages(root), {});
    addImage(root, 'Pistols/Glock-18/Bravo.webp');
    addImage(root, 'Heavy/Negev/Power Loader.webp');

    assert.throws(
      () => enumerateItems(root, manifest),
      (error) => /2 item images have no id/.test(error.message)
        && /Heavy\/Negev\/Power Loader\.webp, Pistols\/Glock-18\/Bravo\.webp/.test(error.message)
        && /registerItemImages\.js/.test(error.message),
    );
  });
});

test('WebP files enumerate with their ids, names and public image paths', () => {
  withTree(['Rifles/AK-47/Redline.webp', 'Rifles/AK-47/Vulcan.webp'], (root) => {
    const items = enumerateItems(root, {
      'Rifles/AK-47/Redline.webp': 1,
      'Rifles/AK-47/Vulcan.webp': 2,
    });

    assert.deepEqual(items.map(({ itemId, name, imagePath }) => ({ itemId, name, imagePath })), [
      { itemId: 1, name: 'AK-47 | Redline', imagePath: '/img/items/Rifles/AK-47/Redline.webp' },
      { itemId: 2, name: 'AK-47 | Vulcan', imagePath: '/img/items/Rifles/AK-47/Vulcan.webp' },
    ]);
  });
});

test('a dot before the WebP extension stays in the skin name', () => {
  withTree(['Heavy/M249/O.S.I.P.R..webp'], (root) => {
    const items = enumerateItems(root, { 'Heavy/M249/O.S.I.P.R..webp': 1 });

    assert.deepEqual(items.map((item) => item.name), ['M249 | O.S.I.P.R.']);
  });
});

test('a stray PNG stops image listing and names the file and converter', () => {
  withTree(['Rifles/AK-47/Redline.png', 'Rifles/AK-47/Vulcan.webp'], (root) => {
    assert.throws(() => listImages(root), {
      message: '1 item images are still PNG: Rifles/AK-47/Redline.png. Run node scripts/convertItemImages.js first.',
    });
  });
});

test('the PNG error lists the first ten sorted paths and counts the rest', () => {
  const keys = Array.from({ length: 12 }, (_, index) => `Rifles/AK-47/Skin${String(index).padStart(2, '0')}.png`);
  withTree([...keys].reverse(), (root) => {
    assert.throws(() => listImages(root), {
      message: `12 item images are still PNG: ${keys.slice(0, 10).join(', ')} and 2 more. Run node scripts/convertItemImages.js first.`,
    });
  });
});

test('the committed manifest has only WebP keys and the item tree has no PNG files', () => {
  assert.ok(Object.keys(readManifest()).every((key) => key.endsWith('.webp')));
  const pngs = fs.readdirSync(IMAGES_PATH, { recursive: true }).filter((file) => file.endsWith('.png'));
  assert.deepEqual(pngs, []);
});
