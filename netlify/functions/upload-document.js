const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejar preflight OPTIONS
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
    // Verificar variables de entorno
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Variables de entorno de Supabase no configuradas');
    }

    // Inicializar cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parsear el cuerpo de la petición
    const { fileName, fileData, fileType, transactionId } = JSON.parse(event.body);

    if (!fileName || !fileData || !transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Datos incompletos' })
      };
    }

    // Convertir base64 a buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const uniqueFileName = `${transactionId}/${timestamp}-${fileName}`;

    // Subir archivo a Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(uniqueFileName, fileBuffer, {
        contentType: fileType,
        upsert: false
      });

    if (error) {
      console.error('Error subiendo archivo:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error subiendo archivo: ' + error.message })
      };
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(uniqueFileName);

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
    console.error('Error en upload-document:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error interno del servidor: ' + error.message })
    };
  }
};
