const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Validar variables de entorno al inicio
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ No definida');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ No definida');
} else {
  console.log('✅ Variables de entorno de Supabase configuradas correctamente');
}

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando función upload-document');
  
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    console.log('🔁 Solicitud OPTIONS recibida');
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    console.error(`❌ Método no permitido: ${event.httpMethod}`);
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    console.log('📥 Datos recibidos:', JSON.stringify({
      fileName: event.body?.fileName ? '✅' : '❌',
      fileData: event.body?.fileData ? '✅' : '❌',
      fileType: event.body?.fileType || 'No especificado',
      transactionId: event.body?.transactionId || 'No especificado'
    }, null, 2));

    // Verificar variables de entorno
    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = '❌ Error: Variables de entorno de Supabase no configuradas';
      console.error(errorMsg);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error de configuración',
          details: errorMsg,
          solution: 'Configura las variables de entorno en Netlify: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY'
        })
      };
    }

    // Inicializar cliente Supabase con opciones mejoradas
    console.log('🔑 Inicializando cliente Supabase');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });
    
    console.log('✅ Cliente Supabase inicializado correctamente');

    // Verificar si el cuerpo de la solicitud está vacío
    if (!event.body) {
      console.error('❌ Error: Cuerpo de la solicitud vacío');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El cuerpo de la solicitud está vacío' })
      };
    }

    // Parsear el cuerpo de la petición
    let body;
    try {
      body = JSON.parse(event.body);
      console.log('📋 Datos parseados correctamente');
    } catch (error) {
      console.error('❌ Error al analizar el cuerpo de la solicitud:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Error al analizar el cuerpo de la solicitud',
          details: error.message
        })
      };
    }

    const { fileName, fileData, fileType, transactionId } = body;

    // Validar campos obligatorios
    if (!fileName) {
      console.error('❌ Error: Nombre de archivo no proporcionado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El nombre del archivo es requerido' })
      };
    }

    if (!fileData) {
      console.error('❌ Error: Datos del archivo no proporcionados');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Los datos del archivo son requeridos' })
      };
    }

    if (!transactionId) {
      console.error('❌ Error: ID de transacción no proporcionado');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El ID de transacción es requerido' })
      };
    }

    console.log(`📤 Preparando para subir archivo: ${fileName} (${fileType || 'tipo no especificado'})`);

    try {
      // Convertir base64 a buffer
      console.log('🔄 Convirtiendo archivo a buffer');
      const fileBuffer = Buffer.from(fileData, 'base64');
      
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('No se pudo convertir el archivo a buffer o el buffer está vacío');
      }
      console.log(`✅ Archivo convertido a buffer (${fileBuffer.length} bytes)`);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const uniqueFileName = `${transactionId}/${timestamp}-${fileName}`;
      console.log(`📂 Ruta de almacenamiento: ${uniqueFileName}`);

      // Verificar si el bucket 'documents' existe
      console.log('🔍 Verificando bucket de almacenamiento...');
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        console.error('❌ Error al listar buckets:', bucketError);
        throw new Error(`No se pudo acceder al almacenamiento: ${bucketError.message}`);
      }
      
      const bucketExists = buckets.some(bucket => bucket.name === 'documents');
      console.log(`📦 Bucket 'documents' ${bucketExists ? 'encontrado' : 'no encontrado'}`);
      
      if (!bucketExists) {
        console.error('❌ Error: El bucket "documents" no existe en Supabase Storage');
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Configuración incorrecta',
            details: 'El bucket de almacenamiento no existe',
            solution: 'Por favor, crea un bucket llamado "documents" en Supabase Storage'
          })
        };
      }

      // Subir archivo a Supabase Storage
      console.log('⬆️  Subiendo archivo a Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(uniqueFileName, fileBuffer, {
          contentType: fileType || 'application/octet-stream',
          upsert: false,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('❌ Error subiendo archivo a Supabase:', uploadError);
        throw new Error(`No se pudo subir el archivo: ${uploadError.message}`);
      }

      console.log('✅ Archivo subido correctamente:', uploadData);

      // Obtener URL pública del archivo
      console.log('🔗 Generando URL pública...');
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uniqueFileName);

      if (!urlData || !urlData.publicUrl) {
        console.error('❌ Error: No se pudo generar la URL pública');
        throw new Error('No se pudo generar la URL pública del archivo');
      }

      console.log('🌐 URL pública generada correctamente');
      console.log('📄 Detalles de la subida:', {
        fileName: uniqueFileName,
        url: urlData.publicUrl,
        size: fileBuffer.length,
        type: fileType || 'No especificado'
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          url: urlData.publicUrl,
          fileName: uniqueFileName,
          message: 'Archivo subido correctamente'
        })
      };

    } catch (error) {
      console.error('❌ Error durante el proceso de subida:', error);
      throw error; // Re-lanzar para ser manejado por el bloque catch externo
    }

  } catch (error) {
    console.error('❌ Error en upload-document:', error);
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
