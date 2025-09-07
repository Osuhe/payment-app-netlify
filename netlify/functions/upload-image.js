const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    // Parse del body que contiene la imagen en base64
    const { imageData, fileName, transactionId } = JSON.parse(event.body);
    
    if (!imageData || !fileName || !transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Faltan datos requeridos' })
      };
    }

    // Convertir base64 a buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `documento_${transactionId}_${timestamp}.${fileExtension}`;
    
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Error subiendo a Supabase Storage:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error subiendo imagen',
          details: error.message 
        })
      };
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(uniqueFileName);

    console.log('✅ Imagen subida correctamente:', urlData.publicUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        fileName: uniqueFileName
      })
    };

  } catch (error) {
    console.error('Error en upload-image function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message 
      })
    };
  }
};
