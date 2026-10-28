const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const orig = 'C:/Users/Dr_Nee/.gemini/antigravity/brain/b854a143-82e2-4c5d-abfd-af181a5d00dc/.user_uploaded/media_1793110818230_601cfcef.jpg';
  const size = 512;
  
  // Create an anti-aliased circular mask
  const circleSvg = `<svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="#ffffff"/></svg>`;

  await sharp(orig)
    .resize(size, size, { fit: 'cover', position: 'center' })
    .composite([{
      input: Buffer.from(circleSvg),
      blend: 'dest-in'
    }])
    .png({ compressionLevel: 9 })
    .toFile('public/boro-maa-emblem.png');

  console.log('Successfully updated public/boro-maa-emblem.png with perfect circle framing');
}

main().catch(console.error);
