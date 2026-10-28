const fs = require('fs');
const path = require('path');

// Bounds from MAP_BOUNDS
const MAP_BOUNDS = {
  west: 88.4014892578125,
  east: 88.43994140625,
  north: 22.91286328803374,
  south: 22.867317960075596,
};
const MAP_WIDTH = 20;
const MAP_DEPTH = 25.714;

function geoTo3D(lat, lng) {
  const normX = (lng - MAP_BOUNDS.west) / (MAP_BOUNDS.east - MAP_BOUNDS.west);
  const normZ = (lat - MAP_BOUNDS.south) / (MAP_BOUNDS.north - MAP_BOUNDS.south);
  const x = (normX - 0.5) * MAP_WIDTH;
  const z = -(normZ - 0.5) * MAP_DEPTH;
  return [Number(x.toFixed(3)), Number(z.toFixed(3))];
}

const buildings = [];

// 1. Process OSM buildings from public/naihati-buildings.json
try {
  const raw = JSON.parse(fs.readFileSync('public/naihati-buildings.json', 'utf8'));
  const nodeMap = new Map();
  for (const el of raw.elements) {
    if (el.type === 'node') {
      nodeMap.set(el.id, { lat: el.lat, lon: el.lon });
    }
  }

  for (const el of raw.elements) {
    if (el.type === 'way' && el.nodes && el.nodes.length >= 3) {
      let sumLat = 0, sumLon = 0, count = 0;
      let minLat = 999, maxLat = -999, minLon = 999, maxLon = -999;
      for (const nid of el.nodes) {
        const node = nodeMap.get(nid);
        if (node) {
          sumLat += node.lat;
          sumLon += node.lon;
          count++;
          if (node.lat < minLat) minLat = node.lat;
          if (node.lat > maxLat) maxLat = node.lat;
          if (node.lon < minLon) minLon = node.lon;
          if (node.lon > maxLon) maxLon = node.lon;
        }
      }
      if (count >= 3) {
        const centerLat = sumLat / count;
        const centerLon = sumLon / count;
        const [x, z] = geoTo3D(centerLat, centerLon);
        const [wX, wZ] = geoTo3D(minLat, minLon);
        const [eX, eZ] = geoTo3D(maxLat, maxLon);
        const w = Math.max(Math.abs(eX - wX), 0.12);
        const d = Math.max(Math.abs(eZ - wZ), 0.12);
        // Height between 0.35 and 1.2 in 3D units
        const levels = el.tags && el.tags['building:levels'] ? Number(el.tags['building:levels']) : null;
        const height = levels ? Math.min(Math.max(levels * 0.18, 0.4), 1.5) : (Math.random() * 0.5 + 0.35);

        buildings.push([
          x,
          z,
          Number(Math.min(w, 0.7).toFixed(3)),
          Number(Math.min(d, 0.7).toFixed(3)),
          Number(height.toFixed(3)),
          0,
        ]);
      }
    }
  }
} catch (e) {
  console.warn('Could not parse OSM buildings:', e.message);
}

console.log(`Extracted ${buildings.length} real OSM building footprints.`);

// 2. Generate procedural residential & commercial city blocks along the paras
// Seeds around Naihati Junction, Station Road, Arbinda Road, Ghoshpara Road, Garifa, Hazinagar, Gouripur, Bijpur
const clusters = [
  // Station & Boro Maa core
  { lat: 22.8889, lng: 88.416, radiusLat: 0.006, radiusLng: 0.005, density: 160 },
  // Naihati Bazaar & Station East
  { lat: 22.887, lng: 88.419, radiusLat: 0.005, radiusLng: 0.006, density: 140 },
  // Ghoshpara Road North & Anandamoyee Tala
  { lat: 22.898, lng: 88.414, radiusLat: 0.007, radiusLng: 0.004, density: 130 },
  // Garifa & Riverside South
  { lat: 22.878, lng: 88.411, radiusLat: 0.006, radiusLng: 0.005, density: 120 },
  // Hazinagar / Gouripur North
  { lat: 22.903, lng: 88.418, radiusLat: 0.006, radiusLng: 0.006, density: 130 },
  // Bijpur & Kalyani road approach
  { lat: 22.895, lng: 88.428, radiusLat: 0.008, radiusLng: 0.007, density: 120 },
  // Eastern residential paras towards expressway
  { lat: 22.882, lng: 88.426, radiusLat: 0.007, radiusLng: 0.006, density: 100 },
];

for (const c of clusters) {
  for (let i = 0; i < c.density; i++) {
    // Avoid river (lng < 88.407)
    const lat = c.lat + (Math.random() - 0.5) * 2 * c.radiusLat;
    const lng = Math.max(c.lng + (Math.random() - 0.5) * 2 * c.radiusLng, 88.4085);
    const [x, z] = geoTo3D(lat, lng);
    const w = Number((Math.random() * 0.28 + 0.16).toFixed(3));
    const d = Number((Math.random() * 0.28 + 0.16).toFixed(3));
    const h = Number((Math.random() * 0.65 + 0.35).toFixed(3));
    const rot = Number((Math.random() * 0.8 - 0.4).toFixed(2));
    buildings.push([x, z, w, d, h, rot]);
  }
}

console.log(`Total 3D buildings created: ${buildings.length}`);
fs.writeFileSync('public/naihati-3d-buildings.json', JSON.stringify(buildings));
console.log('Saved to public/naihati-3d-buildings.json');
