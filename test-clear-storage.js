// Script para limpiar completamente el storage de Supabase
const https = require('https');

// Crear una función que simule la limpieza del storage
const testData = {
  action: 'clear_storage_and_database'
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

console.log('🗑️ Limpiando completamente base de datos y storage...');

const req = https.request(options, (res) => {
  console.log('\n📊 Respuesta del servidor:');
  console.log('Status:', res.statusCode);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 Resultado:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ Limpieza completa exitosa!');
      } else {
        console.log('\n❌ Error en la limpieza');
      }
    } catch (e) {
      console.log('Respuesta:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error en la petición:', e.message);
});

req.write(postData);
req.end();
