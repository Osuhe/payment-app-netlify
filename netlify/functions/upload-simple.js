exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('🚀 [SIMPLE] Iniciando función de subida simplificada');
    
    // Verificar variables de entorno básicas
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables de entorno faltantes');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Variables de entorno no configuradas',
          details: {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey
          }
        })
      };
    }

    // Parsear datos
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseError) {
      console.error('❌ Error parseando JSON:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'JSON inválido',
          details: parseError.message
        })
      };
    }

    const { imageData, fileName, transactionId } = body;

    // Validaciones básicas
    if (!imageData || !fileName || !transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Datos faltantes',
          required: ['imageData', 'fileName', 'transactionId']
        })
      };
    }

    // Intentar subida a Supabase
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false
        }
      });

      // Convertir base64 a buffer
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generar nombre único
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueFileName = `documentos/${transactionId}/doc_${timestamp}.${fileExtension}`;
      
      console.log('📤 Subiendo archivo:', uniqueFileName);

      // Subir archivo
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(uniqueFileName, buffer, {
          contentType: `image/${fileExtension}`,
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Error en upload:', uploadError);
        throw new Error(`Upload error: ${uploadError.message}`);
      }

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(uniqueFileName);

      console.log('✅ Subida exitosa:', urlData.publicUrl);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Archivo subido correctamente',
          data: {
            url: urlData.publicUrl,
            fileName: uniqueFileName,
            originalName: fileName,
            size: buffer.length,
            uploadedAt: new Date().toISOString()
          }
        })
      };

    } catch (supabaseError) {
      console.error('❌ Error con Supabase:', supabaseError);
      
      // Fallback a URL simulada
      const fallbackUrl = `https://via.placeholder.com/400x300/10b981/ffffff?text=Fallback+${transactionId}`;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Usando fallback - Supabase no disponible',
          data: {
            url: fallbackUrl,
            fileName: `fallback_${fileName}`,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
            fallback: true,
            error: supabaseError.message
          }
        })
      };
    }

  } catch (error) {
    console.error('❌ Error general:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};
