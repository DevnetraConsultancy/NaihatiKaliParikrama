const https = require('https');
const fs = require('fs');

// Fetch OSM buildings within Naihati bounding box
const query = `
[out:json][timeout:40];
(
  way["building"](22.87005,88.40478,22.90839,88.43769);
);
out body;
>;
out skel qt;
`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

const req = https.get(url, {
  headers: {
    'User-Agent': 'NaihatiParikramaApp/2.0 (contact: devnetra@gmail.com)'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Fetched OSM elements:', json.elements.length);
      fs.writeFileSync('public/naihati-buildings.json', JSON.stringify(json));
      console.log('Saved to public/naihati-buildings.json');
    } catch (e) {
      console.error('Failed to parse:', e.message, data.slice(0, 200));
    }
  });
});
req.on('error', console.error);
