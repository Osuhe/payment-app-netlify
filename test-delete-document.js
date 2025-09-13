// Script para eliminar el documento específico de Supabase Storage
const fetch = require('node-fetch');

async function deleteDocument() {
  try {
    const fileName = 'documentos_TEST-1672889489407-1672889787763.png';
    
    const response = await fetch('http://localhost:8888/.netlify/functions/delete-document', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer admin-secure-token-2024'
      },
      body: JSON.stringify({
        fileName: fileName
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Documento eliminado exitosamente:', result);
    } else {
      console.error('❌ Error eliminando documento:', result);
    }
    
  } catch (error) {
    console.error('❌ Error en la petición:', error);
  }
}

// Ejecutar la función
deleteDocument();
