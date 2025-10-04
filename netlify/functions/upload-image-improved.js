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
    console.log('🚀 [IMPROVED] Iniciando función de subida de archivos mejorada');
    
    // Verificar variables de entorno
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    console.log('🔍 Verificando variables de entorno...');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Definida' : '❌ No definida');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ No definida');
    console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida');

    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = '❌ Error: Variables de entorno faltantes de Supabase';
      console.error(errorMsg);
      
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error de configuración del servidor',
          details: 'Faltan variables de entorno de Supabase',
          debug: {
            supabaseUrl: !!supabaseUrl,
            supabaseKey: !!supabaseKey,
            env: process.env.NODE_ENV || 'unknown'
          }
        })
      };
    }

    // Inicializar cliente Supabase
    console.log('🔑 Inicializando cliente Supabase mejorado...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    console.log('✅ Cliente Supabase inicializado correctamente');
    
    // Validar y parsear el cuerpo de la solicitud
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('📥 Datos recibidos:', {
        hasImageData: !!body.imageData,
        fileName: body.fileName || 'No proporcionado',
        transactionId: body.transactionId || 'No proporcionado',
        imageDataLength: body.imageData ? body.imageData.length : 0
      });
    } catch (error) {
      console.error('❌ Error al parsear JSON:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Formato de solicitud inválido',
          details: 'El cuerpo de la solicitud debe ser JSON válido'
        })
      };
    }

    const { imageData, fileName, transactionId } = body;
    
    // Validar datos de entrada
    if (!imageData || !fileName || !transactionId) {
      const missingFields = [];
      if (!imageData) missingFields.push('imageData');
      if (!fileName) missingFields.push('fileName');
      if (!transactionId) missingFields.push('transactionId');
      
      console.error(`❌ Campos faltantes: ${missingFields.join(', ')}`);
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Datos incompletos',
          details: `Faltan campos requeridos: ${missingFields.join(', ')}`,
          required: ['imageData', 'fileName', 'transactionId']
        })
      };
    }

    // Validar formato de imagen
    if (!imageData.startsWith('data:image/')) {
      console.error('❌ Formato de imagen inválido');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Formato de imagen inválido',
          details: 'El archivo debe ser una imagen en formato base64'
        })
      };
    }

    try {
      // Convertir base64 a buffer
      console.log('🔄 Procesando imagen...');
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (buffer.length > maxSize) {
        throw new Error(`Archivo demasiado grande: ${(buffer.length / (1024 * 1024)).toFixed(2)}MB. Máximo permitido: 10MB`);
      }
      
      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const uniqueFileName = `documentos/${transactionId}/doc_${timestamp}.${fileExtension}`;
      
      console.log('📂 Preparando subida:', {
        nombreOriginal: fileName,
        nombreUnico: uniqueFileName,
        tamaño: `${(buffer.length / 1024).toFixed(2)} KB`,
        tipo: fileExtension
      });

      // Verificar/crear bucket
      console.log('🗂️ Verificando bucket "documentos"...');
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        
        if (bucketsError) {
          console.error('❌ Error listando buckets:', bucketsError);
          throw new Error(`Error verificando buckets: ${bucketsError.message}`);
        }
        
        const documentosBucket = buckets.find(b => b.name === 'documentos');
        if (!documentosBucket) {
          console.log('⚠️ Bucket "documentos" no existe, creándolo...');
          
          const { error: createError } = await supabase.storage.createBucket('documentos', {
            public: true,
            fileSizeLimit: maxSize
          });
          
          if (createError) {
            console.error('❌ Error creando bucket:', createError);
            throw new Error(`Error creando bucket: ${createError.message}`);
          }
          
          console.log('✅ Bucket "documentos" creado exitosamente');
        } else {
          console.log('✅ Bucket "documentos" ya existe');
        }
      } catch (bucketError) {
        console.error('❌ Error con gestión de bucket:', bucketError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error configurando almacenamiento',
            details: bucketError.message 
          })
        };
      }
      
      // Subir archivo a Supabase Storage
      console.log('⬆️ Subiendo archivo a Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(uniqueFileName, buffer, {
          contentType: `image/${fileExtension}`,
          upsert: true, // Permitir sobrescribir si existe
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Error en upload:', uploadError);
        throw new Error(`Error subiendo archivo: ${uploadError.message}`);
      }

      console.log('📤 Archivo subido, obteniendo URL pública...');

      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from('documentos')
        .getPublicUrl(uniqueFileName);

      if (!urlData || !urlData.publicUrl) {
        throw new Error('No se pudo obtener la URL pública del archivo');
      }

      console.log('✅ Subida exitosa:', {
        archivo: uniqueFileName,
        url: urlData.publicUrl,
        tamaño: `${(buffer.length / 1024).toFixed(2)} KB`
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Archivo subido correctamente a Supabase Storage',
          data: {
            url: urlData.publicUrl,
            fileName: uniqueFileName,
            originalName: fileName,
            path: uploadData.path,
            bucket: 'documentos',
            size: buffer.length,
            uploadedAt: new Date().toISOString(),
            transactionId: transactionId
          }
        })
      };

    } catch (uploadError) {
      console.error('❌ Error en proceso de subida:', uploadError);
      throw uploadError;
    }

  } catch (error) {
    console.error('❌ Error general en función:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: 'Error interno del servidor',
        details: error.message,
        timestamp: new Date().toISOString(),
        function: 'upload-image-improved'
      })
    };
  }
};
