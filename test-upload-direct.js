// Script para probar directamente el upload de imágenes
const https = require('https');

// Datos de prueba - imagen pequeña en base64
const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const testData = {
  imageData: testImageBase64,
  fileName: 'test-document.png',
  transactionId: 'TEST-' + Date.now()
};

const postData = JSON.stringify(testData);

const options = {
  hostname: 'stalwart-jelly-9deaab.netlify.app',
  port: 443,
  path: '/.netlify/functions/upload-image',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🔄 Probando upload de imagen...');
console.log('URL:', `https://${options.hostname}${options.path}`);
console.log('Datos:', {
  fileName: testData.fileName,
  transactionId: testData.transactionId,
  imageSize: testData.imageData.length
});

const req = https.request(options, (res) => {
  console.log('\n📊 Respuesta del servidor:');
  console.log('Status:', res.statusCode);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 Cuerpo de la respuesta:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success) {
        console.log('\n✅ Upload exitoso!');
        console.log('URL del archivo:', response.url);
      } else {
        console.log('\n❌ Upload falló');
        console.log('Error:', response.error);
        if (response.details) {
          console.log('Detalles:', response.details);
        }
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
