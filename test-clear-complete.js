// Script para limpiar usando la acción correcta
const https = require('https');

const testData = {
  action: 'clear_all_transactions'
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'stalwart-jelly-9deaab.netlify.app',
  port: 443,
  path: '/.netlify/functions/database',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-secure-token-2024',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🗑️ Ejecutando limpieza final...');

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ Limpieza completa exitosa!');
        console.log('- Base de datos: limpia');
        console.log('- Storage: archivos eliminados automáticamente');
      }
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(postData);
req.end();
