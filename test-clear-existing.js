// Script para limpiar usando la función database existente
const https = require('https');

const postData = JSON.stringify({
  action: 'clear_all_transactions'
});

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

console.log('🗑️ Limpiando base de datos usando función existente...');

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
        console.log('\n✅ Base de datos limpiada exitosamente!');
      } else {
        console.log('\n❌ Error limpiando base de datos');
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
