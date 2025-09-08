// Script para limpiar completamente la base de datos y storage
const https = require('https');

const postData = JSON.stringify({
  action: 'clear_all'
});

const options = {
  hostname: 'stalwart-jelly-9deaab.netlify.app',
  port: 443,
  path: '/.netlify/functions/clear-all-data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer admin-secure-token-2024',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🗑️ Limpiando toda la base de datos y storage...');

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
      
      if (response.summary && response.summary.status === 'ALL_CLEARED') {
        console.log('\n✅ Todo limpiado exitosamente!');
        console.log(`- Operaciones exitosas: ${response.summary.successful}`);
        console.log(`- Errores: ${response.summary.errors}`);
      } else {
        console.log('\n⚠️ Limpieza parcial o con errores');
      }
    } catch (e) {
      console.log('Respuesta no es JSON válido:');
      console.log(data);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error en la petición:', e.message);
});

req.write(postData);
req.end();
