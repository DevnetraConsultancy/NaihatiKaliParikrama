const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const src = 'C:/Users/Dr_Nee/.gemini/antigravity/brain/b854a143-82e2-4c5d-abfd-af181a5d00dc/.user_uploaded/media_1793186049401_4588abb6.jpg';

async function processImages() {
  if (!fs.existsSync(src)) {
    console.error('Source file not found:', src);
    return;
  }

  // 1. High-res WebP for 3D textures (512x512, quality 92)
  await sharp(src)
    .resize(512, 512)
    .webp({ quality: 92 })
    .toFile('public/kali-mandala.webp');
  console.log('Created public/kali-mandala.webp');

  // 2. High-res PNG
  await sharp(src)
    .resize(512, 512)
    .png({ quality: 95 })
    .toFile('public/kali-mandala.png');
  console.log('Created public/kali-mandala.png');

  // 3. Fast crisp 160x160 for Leaflet canvas pins
  await sharp(src)
    .resize(160, 160)
    .webp({ quality: 90 })
    .toFile('public/kali-pin.webp');
  console.log('Created public/kali-pin.webp');

  await sharp(src)
    .resize(160, 160)
    .jpeg({ quality: 92 })
    .toFile('public/kali-pin.jpg');
  console.log('Updated public/kali-pin.jpg');
}

processImages().catch(console.error);
