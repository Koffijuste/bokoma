// scripts/compress-images.js
// One-shot: resize + compress all big static assets in /public
// Keeps originals as .orig.<ext> for rollback.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const THRESHOLD_BYTES = 500 * 1024;
const JPEG_QUALITY = 78;
const PNG_COMPRESSION = 9;
const MAX_DIMENSION = 1920;

async function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p));
    else if (/\.(jpe?g|png|webp)$/i.test(e.name) && !e.name.endsWith('.orig.jpg') && !e.name.endsWith('.orig.png')) {
      out.push(p);
    }
  }
  return out;
}

async function compressOne(file) {
  const stat = fs.statSync(file);
  if (stat.size <= THRESHOLD_BYTES) return null;
  const origBackup = file.replace(/(\.[^.]+)$/, '.orig$1');
  if (!fs.existsSync(origBackup)) fs.copyFileSync(file, origBackup);

  const input = fs.readFileSync(file);
  const img = sharp(input);
  const meta = await img.metadata();
  const pipeline = img.rotate().resize({
    width: Math.min(meta.width || MAX_DIMENSION, MAX_DIMENSION),
    withoutEnlargement: true,
  });

  let out;
  if (/png/i.test(meta.format)) {
    out = await pipeline.png({ compressionLevel: PNG_COMPRESSION, palette: true }).toBuffer();
  } else if (/webp/i.test(meta.format)) {
    out = await pipeline.webp({ quality: JPEG_QUALITY }).toBuffer();
  } else {
    out = await pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true }).toBuffer();
  }
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, out);
  fs.renameSync(tmp, file);
  const ratio = ((1 - out.length / stat.size) * 100).toFixed(1);
  return { file, before: stat.size, after: out.length, ratio };
}

(async () => {
  const files = await walk(PUBLIC);
  console.log(`Found ${files.length} images. Scanning for >${THRESHOLD_BYTES / 1024}KB…\n`);
  let totalBefore = 0, totalAfter = 0, count = 0;
  for (const f of files) {
    try {
      const r = await compressOne(f);
      if (r) {
        totalBefore += r.before;
        totalAfter += r.after;
        count++;
        console.log(`  ✅ ${path.relative(PUBLIC, r.file)}  ${(r.before/1024).toFixed(0)}KB → ${(r.after/1024).toFixed(0)}KB  (-${r.ratio}%)`);
      }
    } catch (e) {
      console.log(`  ⚠️  ${path.relative(PUBLIC, f)}: ${e.message}`);
    }
  }
  console.log(`\n✅ Done. ${count} compressed. ${(totalBefore/1024/1024).toFixed(1)}MB → ${(totalAfter/1024/1024).toFixed(1)}MB (${((1-totalAfter/totalBefore)*100).toFixed(1)}% saved).`);
})();
