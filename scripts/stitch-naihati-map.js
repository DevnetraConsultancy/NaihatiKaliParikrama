const fs = require('fs');
const path = require('path');
const https = require('https');
const sharp = require('sharp');

// Exact Naihati bounding box
const zoom = 16;
const minX = 48861;
const maxX = 48867;
const minY = 28481;
const maxY = 28489;

const cols = maxX - minX + 1; // 7
const rows = maxY - minY + 1; // 9
const width = cols * 256;     // 1792
const height = rows * 256;    // 2304

function downloadTile(x, y, z) {
  // Use OpenStreetMap standard tiles with accurate Bengali + English labels, railway, and streets
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
  return new Promise((resolve, reject) => {
    https.get(
      url,
      {
        headers: {
          'User-Agent': 'NaihatiKaliParikramaApp/2.0 (contact: devnetra@gmail.com)',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Tile ${z}/${x}/${y} failed with status ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      }
    ).on('error', reject);
  });
}

async function main() {
  console.log(`Downloading ${cols}x${rows} = ${cols * rows} tiles for Naihati at zoom ${zoom}...`);
  const compositeList = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c;
      const y = minY + r;
      try {
        const buffer = await downloadTile(x, y, zoom);
        compositeList.push({
          input: buffer,
          top: r * 256,
          left: c * 256,
        });
        process.stdout.write(`.` );
      } catch (err) {
        console.error(`\nFailed tile ${x}, ${y}:`, err.message);
      }
      // Small 30ms polite delay
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  console.log(`\nStitching ${compositeList.length} tiles into 1792x2304 canvas...`);

  // Create blank transparent canvas and composite all tiles onto it
  const stitched = await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 15, g: 15, b: 20, alpha: 1 },
    },
  })
    .composite(compositeList)
    .webp({ quality: 92 })
    .toBuffer();

  const outPath = path.join(__dirname, '..', 'public', 'naihati-osm-hd.webp');
  fs.writeFileSync(outPath, stitched);
  console.log(`Saved crystal-clear Naihati map to: ${outPath} (${(stitched.length / 1024).toFixed(1)} KB)`);

  // Calculate the exact lat/lng bounding box of the stitched image
  function tile2lon(x, z) {
    return (x / Math.pow(2, z)) * 360 - 180;
  }
  function tile2lat(y, z) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  }

  const bounds = {
    west: tile2lon(minX, zoom),
    east: tile2lon(maxX + 1, zoom),
    north: tile2lat(minY, zoom),
    south: tile2lat(maxY + 1, zoom),
  };

  console.log('Stitched Map Exact Bounds:', JSON.stringify(bounds, null, 2));
}

main().catch(console.error);
