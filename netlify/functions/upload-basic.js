// Función básica sin dependencias complejas
exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    console.log('🚀 [BASIC] Función básica de upload iniciada');
    
    // Parsear datos
    const body = JSON.parse(event.body || '{}');
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

    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    console.log('🔍 Variables:', {
      supabaseUrl: !!supabaseUrl,
      supabaseKey: !!supabaseKey
    });

    // Si no hay Supabase configurado, usar fallback inmediatamente
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase no configurado, usando fallback');
      const fallbackUrl = `https://via.placeholder.com/400x300/10b981/ffffff?text=Config+Missing+${transactionId}`;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Fallback - Variables de entorno faltantes',
          data: {
            url: fallbackUrl,
            fileName: `fallback_${fileName}`,
            originalName: fileName,
            uploadedAt: new Date().toISOString(),
            fallback: true,
            reason: 'Variables de entorno no configuradas'
          }
        })
      };
    }

    // Intentar con Supabase (sin importar el módulo hasta aquí)
    try {
      const { createClient } = require('@supabase/supabase-js');
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Convertir base64 a buffer
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Nombre único
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueFileName = `documentos/${transactionId}/doc_${timestamp}.${fileExtension}`;
      
      console.log('📤 Subiendo a Supabase:', uniqueFileName);

      // Upload
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(uniqueFileName, buffer, {
          contentType: `image/${fileExtension}`,
          upsert: true
        });

      if (uploadError) {
        throw new Error(`Supabase error: ${uploadError.message}`);
      }

      // URL pública
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(uniqueFileName);

      console.log('✅ Upload exitoso:', urlData.publicUrl);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Archivo subido a Supabase Storage',
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
      console.error('❌ Error Supabase:', supabaseError.message);
      
      // Fallback
      const fallbackUrl = `https://via.placeholder.com/400x300/f59e0b/ffffff?text=Supabase+Error+${transactionId}`;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Fallback - Error de Supabase',
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
    
    // Fallback final
    const fallbackUrl = `https://via.placeholder.com/400x300/ef4444/ffffff?text=Error+${Date.now()}`;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Fallback - Error general',
        data: {
          url: fallbackUrl,
          fileName: 'error_fallback.jpg',
          originalName: 'unknown',
          uploadedAt: new Date().toISOString(),
          fallback: true,
          error: error.message
        }
      })
    };
  }
};
