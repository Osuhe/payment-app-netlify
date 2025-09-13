const { createClient } = require('@supabase/supabase-js');

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
    console.log('📤 Iniciando upload-image-improved function');
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL || 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables de entorno faltantes');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Configuración de Supabase incompleta',
          details: 'Variables de entorno SUPABASE_URL y SUPABASE_ANON_KEY requeridas'
        })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse del body
    const { imageData, fileName, transactionId } = JSON.parse(event.body);
    
    console.log('Datos recibidos:', {
      fileName,
      transactionId,
      imageDataLength: imageData ? imageData.length : 0
    });
    
    if (!imageData || !fileName || !transactionId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Faltan datos requeridos',
          required: ['imageData', 'fileName', 'transactionId']
        })
      };
    }

    // Convertir base64 a buffer
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `documento_${transactionId}_${timestamp}.${fileExtension}`;
    
    console.log('Subiendo archivo:', {
      originalName: fileName,
      uniqueName: uniqueFileName,
      size: buffer.length,
      bucket: 'documentos'
    });
    
    // Verificar que el bucket existe
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw new Error(`Error verificando buckets: ${bucketsError.message}`);
      }
      
      const documentosBucket = buckets.find(b => b.name === 'documentos');
      if (!documentosBucket) {
        console.log('⚠️ Bucket "documentos" no existe, creándolo...');
        
        const { error: createError } = await supabase.storage.createBucket('documentos', {
          public: true
        });
        
        if (createError) {
          throw new Error(`Error creando bucket: ${createError.message}`);
        }
        
        console.log('✅ Bucket "documentos" creado');
      }
    } catch (bucketError) {
      console.error('❌ Error con bucket:', bucketError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error verificando storage',
          details: bucketError.message 
        })
      };
    }
    
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('❌ Error subiendo a Supabase Storage:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error subiendo imagen',
          details: error.message,
          code: error.statusCode || 'UNKNOWN'
        })
      };
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(uniqueFileName);

    console.log('✅ Imagen subida correctamente:', {
      fileName: uniqueFileName,
      url: urlData.publicUrl,
      bucket: 'documentos',
      path: data.path
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        url: urlData.publicUrl,
        fileName: uniqueFileName,
        path: data.path,
        bucket: 'documentos'
      })
    };

  } catch (error) {
    console.error('❌ Error en upload-image-improved function:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno del servidor',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
