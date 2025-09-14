const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Configuración de CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar solicitudes OPTIONS para CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('🚀 Iniciando función de subida de archivos');
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = '❌ Error: Variables de entorno faltantes. Asegúrate de configurar SUPABASE_URL y SUPABASE_ANON_KEY';
      console.error(errorMsg);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error de configuración',
          details: errorMsg,
          solution: 'Configura las variables de entorno en Netlify: SUPABASE_URL y SUPABASE_ANON_KEY'
        })
      };
    }

    // Inicializar cliente Supabase
    console.log('🔑 Inicializando cliente Supabase');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Validar y parsear el cuerpo de la solicitud
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (error) {
      const errorMsg = '❌ Error al analizar el cuerpo de la solicitud';
      console.error(errorMsg, error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Formato de solicitud inválido',
          details: errorMsg
        })
      };
    }

    const { imageData, fileName, transactionId } = body;
    
    console.log('📄 Datos recibidos:', {
      fileName: fileName || 'No proporcionado',
      transactionId: transactionId || 'No proporcionado',
      imageDataLength: imageData ? imageData.length : 0
    });
    
    // Validar datos de entrada
    if (!imageData || !fileName || !transactionId) {
      const missingFields = [];
      if (!imageData) missingFields.push('imageData');
      if (!fileName) missingFields.push('fileName');
      if (!transactionId) missingFields.push('transactionId');
      
      const errorMsg = `Faltan campos requeridos: ${missingFields.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Datos incompletos',
          details: errorMsg,
          required: ['imageData', 'fileName', 'transactionId']
        })
      };
    }

    // Validar formato de imagen
    if (!imageData.startsWith('data:image/')) {
      const errorMsg = 'El formato de la imagen no es válido. Debe ser una imagen en formato base64';
      console.error(`❌ ${errorMsg}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Formato de imagen inválido',
          details: errorMsg
        })
      };
    }

    try {
      // Convertir base64 a buffer
      console.log('🔄 Convirtiendo imagen a buffer');
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.length > maxSize) {
        throw new Error(`El archivo es demasiado grande (${(buffer.length / (1024 * 1024)).toFixed(2)}MB). Tamaño máximo permitido: 10MB`);
      }
      
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueFileName = `documentos/${transactionId}/doc_${timestamp}.${fileExtension}`;
      
      console.log('📂 Archivo a subir:', {
        nombreOriginal: fileName,
        nombreUnico: uniqueFileName,
        tamaño: `${(buffer.length / 1024).toFixed(2)} KB`,
        tipo: fileExtension
      });
    
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
      console.log('⬆️  Subiendo archivo a Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(uniqueFileName, buffer, {
          contentType: `image/${fileExtension}`,
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Error al subir el archivo:', uploadError);
        throw new Error(`Error al subir el archivo: ${uploadError.message}`);
      }

      // Obtener URL pública del archivo
      console.log('🔗 Obteniendo URL pública...');
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(uniqueFileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('No se pudo obtener la URL pública del archivo');
      }

      console.log('✅ Archivo subido exitosamente:', {
        nombre: uniqueFileName,
        url: urlData.publicUrl,
        bucket: 'documentos',
        ruta: uploadData.path,
        tamaño: `${(buffer.length / 1024).toFixed(2)} KB`
      });

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
            path: uploadData.path,
            bucket: 'documentos',
            size: buffer.length,
            uploadedAt: new Date().toISOString()
          }
        })
      };
    } catch (uploadError) {
      console.error('❌ Error en el proceso de subida:', uploadError);
      throw uploadError;
    }

  } catch (error) {
    console.error('❌ Error en la función de subida:', error);
    
    // Determinar el código de estado adecuado
    const statusCode = error.statusCode || 500;
    const errorMessage = error.message || 'Error interno del servidor';
    
    // Mensaje de error amigable
    let userFriendlyMessage = 'Ocurrió un error al procesar tu solicitud';
    
    if (errorMessage.includes('already exists')) {
      userFriendlyMessage = 'Ya existe un archivo con el mismo nombre. Por favor, intenta con otro nombre.';
    } else if (errorMessage.includes('File size exceeds')) {
      userFriendlyMessage = 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.';
    } else if (errorMessage.includes('invalid base64')) {
      userFriendlyMessage = 'El formato de la imagen no es válido. Asegúrate de subir una imagen en formato base64.';
    }
    
    return {
      statusCode,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: userFriendlyMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
    };
  }
};
