import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const TEMP_DIR = path.resolve('scripts/temp_catalog');
const REPO_DIR = path.join(TEMP_DIR, 'repo');
const OUTPUT_JSON = path.resolve('src/data/models_2019_present.json');

async function ensureSource() {
  if (fs.existsSync(REPO_DIR)) {
    console.log('Using local cloned repo:', REPO_DIR);
    return REPO_DIR;
  }
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }
  console.log('Cloning repo via git clone --depth 1...');
  execSync(`git clone --depth 1 https://github.com/bytecharts/device_specs_gsmarena.git "${REPO_DIR}"`, { stdio: 'inherit' });
  return REPO_DIR;
}

function parseYear(releaseDateStr) {
  if (!releaseDateStr) return null;
  // Match 4 digits: e.g. "Released 2016, October" or "2015, March"
  const m = releaseDateStr.match(/\b(20[12]\d)\b/);
  return m ? parseInt(m[1], 10) : null;
}

function getBrandFromFolder(folderName) {
  if (folderName.startsWith('apple')) return 'Apple';
  if (folderName.startsWith('samsung')) return 'Samsung';
  if (folderName.startsWith('xiaomi')) return 'Xiaomi';
  if (folderName.startsWith('vivo')) return 'Vivo';
  if (folderName.startsWith('oppo')) return 'Oppo';
  if (folderName.startsWith('oneplus')) return 'OnePlus';
  if (folderName.startsWith('motorola')) return 'Motorola';
  if (folderName.startsWith('google')) return 'Google';
  if (folderName.startsWith('nokia')) return 'Nokia';
  if (folderName.startsWith('sony')) return 'Sony';
  return folderName;
}

function findJsonFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(findJsonFiles(fullPath));
    } else if (entry.name === 'details.json') {
      results.push(fullPath);
    }
  }
  return results;
}

async function fetchRealmeModels() {
  console.log('Fetching Realme models from MobileModels repository...');
  try {
    const res = await fetch('https://raw.githubusercontent.com/KHwang9883/MobileModels/master/brands/realme_global_en.md');
    if (!res.ok) return [];
    const text = await res.text();

    const models = [];
    const lines = text.split(/\r?\n/);
    let currentModelName = null;
    let currentCodes = [];

    const guessYear = (name) => {
      const n = name.toLowerCase();
      if (/realme (1\b|2\b|u1\b)/i.test(n)) return 2018;
      if (/realme (3\b|5\b|x\b|xt\b)/i.test(n)) return 2019;
      if (/realme (6\b|7\b|c11\b|c12\b|c15\b|c17\b|narzo 10\b|narzo 20\b|x50\b|x7\b)/i.test(n)) return 2020;
      if (/realme (8\b|gt\b|gt neo\b|c20\b|c21\b|c25\b|narzo 30\b)/i.test(n)) return 2021;
      if (/realme (9\b|10\b|gt 2\b|c30\b|c31\b|c33\b|c35\b|narzo 50\b)/i.test(n)) return 2022;
      if (/realme (11\b|gt 3\b|gt 5\b|c51\b|c53\b|c55\b|narzo 60\b|narzo n53|narzo n55)/i.test(n)) return 2023;
      if (/realme (12\b|13\b|14\b|p1\b|p2\b|gt 6\b|narzo 70\b|narzo n61|narzo n63|narzo n65|c61|c63|c65|c67)/i.test(n)) return 2024;
      return 2021;
    };

    const addModelIfValid = (name, codes) => {
      if (!name || /pad/i.test(name)) return;
      const year = guessYear(name);
      if (year >= 2015) {
        let display = name.replace(/^realme\s+/i, '');
        display = `Realme ${display}`;
        const id = `realme_${display.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;
        models.push({
          id,
          brand: 'Realme',
          model: display,
          releaseYear: year,
          modelCodes: codes.length > 0 ? Array.from(new Set(codes)) : undefined
        });
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();
      const boldMatch = trimmed.match(/^\*\*([^*]+)\*\*:?/);
      if (boldMatch) {
        if (currentModelName) {
          addModelIfValid(currentModelName, currentCodes);
        }
        currentModelName = boldMatch[1].replace(/:$/, '').replace(/\s*\([^)]*\)/g, '').trim();
        currentCodes = [];
        continue;
      }

      const codeMatches = trimmed.match(/`([A-Z0-9_-]+)`/g);
      if (codeMatches && currentModelName) {
        codeMatches.forEach(c => currentCodes.push(c.replace(/`/g, '')));
      }
    }

    if (currentModelName) {
      addModelIfValid(currentModelName, currentCodes);
    }

    console.log(`Parsed ${models.length} Realme models (>= 2015).`);
    return models;
  } catch (err) {
    console.error('Failed to fetch Realme models:', err);
    return [];
  }
}

async function fetchNothingModels() {
  return [
    { id: 'nothing_phone_1', brand: 'Nothing', model: 'Nothing Phone (1)', releaseYear: 2022, modelCodes: ['A063'] },
    { id: 'nothing_phone_2', brand: 'Nothing', model: 'Nothing Phone (2)', releaseYear: 2023, modelCodes: ['A065'] },
    { id: 'nothing_phone_2a', brand: 'Nothing', model: 'Nothing Phone (2a)', releaseYear: 2024, modelCodes: ['A142'] },
    { id: 'nothing_phone_2a_plus', brand: 'Nothing', model: 'Nothing Phone (2a) Plus', releaseYear: 2024, modelCodes: ['A142P'] },
    { id: 'nothing_cmf_phone_1', brand: 'Nothing', model: 'CMF Phone 1', releaseYear: 2024, modelCodes: ['A015'] }
  ];
}

function getInfinixModels() {
  const list = [
    // 2016-2018
    { model: 'Infinix Hot 4', year: 2016, codes: ['X557'] },
    { model: 'Infinix Note 3', year: 2016, codes: ['X601'] },
    { model: 'Infinix Hot 5', year: 2017, codes: ['X559'] },
    { model: 'Infinix Note 4', year: 2017, codes: ['X572'] },
    { model: 'Infinix Hot 6', year: 2018, codes: ['X606'] },
    { model: 'Infinix Hot 6 Pro', year: 2018, codes: ['X608'] },
    { model: 'Infinix Note 5', year: 2018, codes: ['X604'] },
    { model: 'Infinix Smart 2', year: 2018, codes: ['X5515'] },
    { model: 'Infinix Smart 2 Pro', year: 2018, codes: ['X5514'] },
    // 2019-2024
    { model: 'Infinix Hot 7', year: 2019, codes: ['X624'] },
    { model: 'Infinix Hot 7 Pro', year: 2019, codes: ['X625'] },
    { model: 'Infinix Smart 3 Plus', year: 2019, codes: ['X271'] },
    { model: 'Infinix Hot 8', year: 2019, codes: ['X650C'] },
    { model: 'Infinix Hot 9', year: 2020, codes: ['X655'] },
    { model: 'Infinix Hot 9 Pro', year: 2020, codes: ['X655F'] },
    { model: 'Infinix Hot 10', year: 2020, codes: ['X682B'] },
    { model: 'Infinix Hot 10 Play', year: 2021, codes: ['X688B'] },
    { model: 'Infinix Hot 10S', year: 2021, codes: ['X689'] },
    { model: 'Infinix Hot 11', year: 2021, codes: ['X662'] },
    { model: 'Infinix Hot 11S', year: 2021, codes: ['X6812'] },
    { model: 'Infinix Hot 12', year: 2022, codes: ['X6817'] },
    { model: 'Infinix Hot 12 Play', year: 2022, codes: ['X6816'] },
    { model: 'Infinix Hot 12 Pro', year: 2022, codes: ['X668'] },
    { model: 'Infinix Hot 20', year: 2022, codes: ['X6826'] },
    { model: 'Infinix Hot 20 5G', year: 2022, codes: ['X666'] },
    { model: 'Infinix Hot 20 Play', year: 2022, codes: ['X6825'] },
    { model: 'Infinix Hot 30', year: 2023, codes: ['X6831'] },
    { model: 'Infinix Hot 30 5G', year: 2023, codes: ['X669'] },
    { model: 'Infinix Hot 30i', year: 2023, codes: ['X669C'] },
    { model: 'Infinix Hot 40', year: 2023, codes: ['X6836'] },
    { model: 'Infinix Hot 40 Pro', year: 2023, codes: ['X6837'] },
    { model: 'Infinix Hot 50 5G', year: 2024, codes: ['X6720'] },
    { model: 'Infinix Note 7', year: 2020, codes: ['X690'] },
    { model: 'Infinix Note 8', year: 2020, codes: ['X692'] },
    { model: 'Infinix Note 10', year: 2021, codes: ['X693'] },
    { model: 'Infinix Note 10 Pro', year: 2021, codes: ['X695'] },
    { model: 'Infinix Note 11', year: 2021, codes: ['X663'] },
    { model: 'Infinix Note 11S', year: 2021, codes: ['X698'] },
    { model: 'Infinix Note 11 Pro', year: 2021, codes: ['X697'] },
    { model: 'Infinix Note 12', year: 2022, codes: ['X670'] },
    { model: 'Infinix Note 12 Pro', year: 2022, codes: ['X676B'] },
    { model: 'Infinix Note 12 Pro 5G', year: 2022, codes: ['X671B'] },
    { model: 'Infinix Note 30 5G', year: 2023, codes: ['X6711'] },
    { model: 'Infinix Note 40 5G', year: 2024, codes: ['X6852'] },
    { model: 'Infinix Note 40 Pro 5G', year: 2024, codes: ['X6851'] },
    { model: 'Infinix Smart 4 Plus', year: 2020, codes: ['X680D'] },
    { model: 'Infinix Smart 5', year: 2020, codes: ['X657'] },
    { model: 'Infinix Smart 6', year: 2021, codes: ['X6511'] },
    { model: 'Infinix Smart 6 Plus', year: 2022, codes: ['X6823C'] },
    { model: 'Infinix Smart 7', year: 2023, codes: ['X6515'] },
    { model: 'Infinix Smart 7 HD', year: 2023, codes: ['X6516'] },
    { model: 'Infinix Smart 8', year: 2023, codes: ['X6716'] },
    { model: 'Infinix Smart 8 HD', year: 2023, codes: ['X6525'] },
    { model: 'Infinix GT 10 Pro', year: 2023, codes: ['X6739'] },
    { model: 'Infinix GT 20 Pro', year: 2024, codes: ['X6871'] }
  ];
  return list.map(item => ({
    id: `infinix_${item.model.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    brand: 'Infinix',
    model: item.model,
    releaseYear: item.year,
    modelCodes: item.codes
  }));
}

function getTecnoModels() {
  const list = [
    // 2017-2018
    { model: 'Tecno Camon i', year: 2018, codes: ['IN1'] },
    { model: 'Tecno Camon iSky', year: 2018, codes: ['IN2'] },
    { model: 'Tecno Camon iAce', year: 2018, codes: ['IN1-Ace'] },
    { model: 'Tecno Camon iClick', year: 2018, codes: ['IN6'] },
    { model: 'Tecno Spark', year: 2017, codes: ['K7'] },
    { model: 'Tecno Spark 2', year: 2018, codes: ['KA7'] },
    { model: 'Tecno Spark 3', year: 2019, codes: ['KB7'] },
    { model: 'Tecno Spark 4', year: 2019, codes: ['KC8'] },
    // 2020-2024
    { model: 'Tecno Spark 6', year: 2020, codes: ['KE7'] },
    { model: 'Tecno Spark 6 Go', year: 2020, codes: ['KE5'] },
    { model: 'Tecno Spark 7', year: 2021, codes: ['KF6'] },
    { model: 'Tecno Spark 7T', year: 2021, codes: ['KF6p'] },
    { model: 'Tecno Spark 7 Pro', year: 2021, codes: ['KF8'] },
    { model: 'Tecno Spark 8', year: 2021, codes: ['KG6'] },
    { model: 'Tecno Spark 8T', year: 2021, codes: ['KG6p'] },
    { model: 'Tecno Spark 8 Pro', year: 2021, codes: ['KG8'] },
    { model: 'Tecno Spark 9', year: 2022, codes: ['KG5'] },
    { model: 'Tecno Spark 9T', year: 2022, codes: ['KH6'] },
    { model: 'Tecno Spark 10', year: 2023, codes: ['KI5'] },
    { model: 'Tecno Spark 10C', year: 2023, codes: ['KI5k'] },
    { model: 'Tecno Spark 10 Pro', year: 2023, codes: ['KI7'] },
    { model: 'Tecno Spark 20', year: 2023, codes: ['KJ5'] },
    { model: 'Tecno Spark 20 Pro', year: 2023, codes: ['KJ6'] },
    { model: 'Tecno Spark 20 Pro+', year: 2024, codes: ['KJ7'] },
    { model: 'Tecno Spark Go 2020', year: 2020, codes: ['KE5k'] },
    { model: 'Tecno Spark Go 2021', year: 2021, codes: ['KF4'] },
    { model: 'Tecno Spark Go 2022', year: 2022, codes: ['KG5k'] },
    { model: 'Tecno Spark Go 2023', year: 2023, codes: ['BF7'] },
    { model: 'Tecno Spark Go 2024', year: 2023, codes: ['BG6'] },
    { model: 'Tecno Pova', year: 2020, codes: ['LD7'] },
    { model: 'Tecno Pova 2', year: 2021, codes: ['LE7'] },
    { model: 'Tecno Pova 3', year: 2022, codes: ['LF7'] },
    { model: 'Tecno Pova 4', year: 2022, codes: ['LG7'] },
    { model: 'Tecno Pova 4 Pro', year: 2022, codes: ['LG8'] },
    { model: 'Tecno Pova 5', year: 2023, codes: ['LH7'] },
    { model: 'Tecno Pova 5 Pro 5G', year: 2023, codes: ['LH8'] },
    { model: 'Tecno Pova 6 Pro 5G', year: 2024, codes: ['LI9'] },
    { model: 'Tecno Camon 15', year: 2020, codes: ['CD7'] },
    { model: 'Tecno Camon 16', year: 2020, codes: ['CE7'] },
    { model: 'Tecno Camon 17', year: 2021, codes: ['CG6'] },
    { model: 'Tecno Camon 18', year: 2021, codes: ['CH6'] },
    { model: 'Tecno Camon 19', year: 2022, codes: ['CI6'] },
    { model: 'Tecno Camon 19 Pro', year: 2022, codes: ['CI8'] },
    { model: 'Tecno Camon 20', year: 2023, codes: ['CK6'] },
    { model: 'Tecno Camon 20 Pro 5G', year: 2023, codes: ['CK8n'] },
    { model: 'Tecno Camon 30 5G', year: 2024, codes: ['CL7'] }
  ];
  return list.map(item => ({
    id: `tecno_${item.model.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    brand: 'Tecno',
    model: item.model,
    releaseYear: item.year,
    modelCodes: item.codes
  }));
}

async function main() {
  const rootExtracted = await ensureSource();
  console.log('Finding all details.json files...');
  const jsonFiles = findJsonFiles(rootExtracted);
  console.log(`Found ${jsonFiles.length} detail specs.`);

  const modelsList = [];
  const brandCounts = {};

  for (const filePath of jsonFiles) {
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      if (!json.status || !json.data) continue;

      const data = json.data;
      const rawModelName = data.model;
      if (!rawModelName) continue;

      // Filter watches, tablets, bands if unnecessary (keep phones)
      if (/watch|band|pad\b|tablet|gear\s\b/i.test(rawModelName) && !/pad\sphone/i.test(rawModelName)) {
        continue;
      }

      // We now extract from 2015 to present!
      const releaseYear = parseYear(data.release_date);
      if (!releaseYear || releaseYear < 2015) continue;

      // Determine brand
      const relative = path.relative(rootExtracted, filePath);
      const folderBrand = relative.split(path.sep)[0];
      let brand = getBrandFromFolder(folderBrand);

      // Check sub-brands: Poco, Redmi, iQOO
      let refinedBrand = brand;
      let displayModel = rawModelName;

      if (brand === 'Xiaomi') {
        if (/\bpoco\b/i.test(rawModelName)) {
          refinedBrand = 'Poco';
          displayModel = rawModelName.replace(/^xiaomi\s+/i, '');
        } else if (/\bredmi\b/i.test(rawModelName)) {
          refinedBrand = 'Redmi';
          displayModel = rawModelName.replace(/^xiaomi\s+/i, '');
        } else {
          refinedBrand = 'Xiaomi';
          displayModel = rawModelName.replace(/^xiaomi\s+/i, '');
        }
      } else if (brand === 'Vivo') {
        if (/\biqoo\b/i.test(rawModelName)) {
          refinedBrand = 'iQOO';
          displayModel = rawModelName.replace(/^vivo\s+/i, '');
        } else {
          refinedBrand = 'Vivo';
          displayModel = rawModelName.replace(/^vivo\s+/i, '');
        }
      } else if (brand === 'Apple') {
        displayModel = rawModelName.replace(/^apple\s+/i, '');
      } else if (brand === 'Samsung') {
        displayModel = rawModelName.replace(/^samsung\s+/i, '');
      } else if (brand === 'Motorola') {
        displayModel = rawModelName.replace(/^motorola\s+/i, '');
      } else if (brand === 'Google') {
        displayModel = rawModelName.replace(/^google\s+/i, '');
      } else if (brand === 'OnePlus') {
        displayModel = rawModelName.replace(/^oneplus\s+/i, '');
      }

      const id = `${refinedBrand.toLowerCase()}_${displayModel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')}`;

      // Extract model numbers if present in specs
      const modelCodes = [];
      const miscModels = data.specifications?.Misc?.Models;
      if (miscModels) {
        miscModels.split(',').forEach(c => {
          const clean = c.trim();
          if (clean && clean.length > 2) modelCodes.push(clean);
        });
      }

      modelsList.push({
        id,
        brand: refinedBrand,
        parentBrand: brand !== refinedBrand ? brand : undefined,
        model: displayModel,
        releaseYear,
        photoUrl: data.imageUrl || (data.device_images && data.device_images[0]?.url) || undefined,
        modelCodes: modelCodes.length > 0 ? Array.from(new Set(modelCodes)) : undefined
      });

      brandCounts[refinedBrand] = (brandCounts[refinedBrand] || 0) + 1;
    } catch (e) {
      // ignore parse error
    }
  }

  // Add Realme
  const realme = await fetchRealmeModels();
  realme.forEach(m => {
    modelsList.push(m);
    brandCounts['Realme'] = (brandCounts['Realme'] || 0) + 1;
  });

  // Add Infinix
  const infinix = getInfinixModels();
  infinix.forEach(m => {
    modelsList.push(m);
    brandCounts['Infinix'] = (brandCounts['Infinix'] || 0) + 1;
  });

  // Add Tecno
  const tecno = getTecnoModels();
  tecno.forEach(m => {
    modelsList.push(m);
    brandCounts['Tecno'] = (brandCounts['Tecno'] || 0) + 1;
  });

  // Add Nothing
  const nothing = await fetchNothingModels();
  nothing.forEach(m => {
    modelsList.push(m);
    brandCounts['Nothing'] = (brandCounts['Nothing'] || 0) + 1;
  });

  // Sort by brand then model name
  modelsList.sort((a, b) => {
    if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
    return a.model.localeCompare(b.model);
  });

  // Deduplicate by ID
  const uniqueModelsMap = new Map();
  modelsList.forEach(item => {
    if (!uniqueModelsMap.has(item.id)) {
      uniqueModelsMap.set(item.id, item);
    }
  });

  const uniqueModels = Array.from(uniqueModelsMap.values());

  // Save to src/data/models_2019_present.json
  const outDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(uniqueModels, null, 2), 'utf-8');

  console.log(`\n========================================`);
  console.log(`SUCCESS! Extracted ${uniqueModels.length} phone models (2015 to now).`);
  console.log(`Saved to: ${OUTPUT_JSON}`);
  console.log(`\nBreakdown by brand:`);
  console.table(brandCounts);
  console.log(`========================================\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
