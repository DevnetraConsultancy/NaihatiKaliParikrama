const sharp = require('sharp');
const dir = 'C:/Users/Dr_Nee/.gemini/antigravity/brain/b854a143-82e2-4c5d-abfd-af181a5d00dc/.user_uploaded/';
const fPolice = dir + 'media_1793210582353_b0815393.png';
const fHospital = dir + 'media_1793210582386_8ca7ec3a.png';

async function main() {
  await sharp(fPolice).resize(256, 256).webp({ quality: 95 }).toFile('public/police-pin.webp');
  await sharp(fPolice).resize(256, 256).png().toFile('public/police-pin.png');
  await sharp(fHospital).resize(256, 256).webp({ quality: 95 }).toFile('public/hospital-pin.webp');
  await sharp(fHospital).resize(256, 256).png().toFile('public/hospital-pin.png');
  console.log('Successfully generated public/police-pin.webp, public/police-pin.png, public/hospital-pin.webp, public/hospital-pin.png');
}

main().catch(console.error);
