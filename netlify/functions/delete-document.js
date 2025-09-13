const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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
    // Verificar token de admin
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.includes('admin-secure-token-2024')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado' })
      };
    }

    const { fileName } = JSON.parse(event.body);
    
    if (!fileName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nombre de archivo requerido' })
      };
    }

    // Eliminar el archivo específico del bucket 'documentos'
    const { data, error } = await supabase.storage
      .from('documentos')
      .remove([fileName]);

    if (error) {
      console.error('Error eliminando archivo:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error eliminando archivo',
          details: error.message 
        })
      };
    }

    console.log('✅ Archivo eliminado correctamente:', fileName);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Archivo ${fileName} eliminado correctamente`,
        deletedFile: fileName
      })
    };

  } catch (error) {
    console.error('Error en delete-document function:', error);
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
