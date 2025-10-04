const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// Validar variables de entorno críticas
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error crítico: Variables de entorno de Supabase no configuradas');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Definida' : '❌ No definida');
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ No definida');
  
  // Lanzar error inmediatamente para identificar problemas de configuración
  throw new Error('Configuración de Supabase incompleta. Verifica las variables de entorno.');
}

console.log('🔧 Configuración de Supabase:');
console.log('- URL:', supabaseUrl);
console.log('- Clave:', supabaseKey ? '✅ Configurada' : '❌ No configurada');
console.log('- Usando Service Role Key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

// Inicializar cliente Supabase
let supabase;
try {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  console.log('✅ Cliente Supabase inicializado correctamente');
} catch (error) {
  console.error('❌ Error al inicializar el cliente Supabase:', error.message);
  throw new Error(`Error al inicializar Supabase: ${error.message}`);
}

// Función para generar respuesta estándar
const createResponse = (statusCode, body, customHeaders = {}) => {
  const defaultHeaders = {
    'Access-Control-Allow-Origin': process.env.URL || '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };
  
  return {
    statusCode,
    headers: { ...defaultHeaders, ...customHeaders },
    body: JSON.stringify(body)
  };
};

exports.handler = async (event, context) => {
  console.log('🚀 Iniciando función upload-document');
  console.log('🔍 Evento recibido:', {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers,
    body: event.body ? 'Body presente' : 'Sin body',
    env: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Definida' : '❌ No definida',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Definida' : '❌ No definida',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Definida' : '❌ No definida',
      URL: process.env.URL || 'No definida'
    }
  });
  
  // Verificar variables de entorno críticas
  if (!process.env.SUPABASE_URL) {
    console.error('❌ Error crítico: SUPABASE_URL no está definida');
  }
  if (!process.env.SUPABASE_ANON_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error crítico: No hay claves de API de Supabase configuradas');
  }
  
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
    return createResponse(200, { message: 'OK' });
  }

  // Solo permitir método POST
  if (event.httpMethod !== 'POST') {
    const errorMsg = `Método no permitido: ${event.httpMethod}. Se esperaba POST`;
    console.error(`❌ ${errorMsg}`);
    return createResponse(405, { 
      error: 'Método no permitido',
      message: errorMsg,
      allowedMethods: ['POST', 'OPTIONS']
    });
  }

  try {
    // Verificar si el cuerpo está vacío
    if (!event.body) {
      const errorMsg = 'El cuerpo de la solicitud está vacío';
      console.error(`❌ ${errorMsg}`);
      return createResponse(400, {
        error: 'Solicitud inválida',
        message: errorMsg
      });
    }

    // Parsear el cuerpo de la solicitud
    let requestBody;
    try {
      requestBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      console.log('📥 Datos recibidos:', {
        fileName: requestBody.fileName ? '✅' : '❌ No proporcionado',
        fileData: requestBody.fileData ? `✅ (${requestBody.fileData.length} caracteres)` : '❌ No proporcionado',
        fileType: requestBody.fileType || 'No especificado',
        transactionId: requestBody.transactionId || 'No especificado'
      });
    } catch (parseError) {
      console.error('❌ Error al analizar el cuerpo de la solicitud:', parseError);
      return createResponse(400, {
        error: 'Formato de solicitud inválido',
        message: 'El cuerpo de la solicitud debe ser un JSON válido',
        details: parseError.message
      });
    }

    // Validar datos de entrada
    const requiredFields = ['fileName', 'fileData', 'transactionId'];
    const missingFields = requiredFields.filter(field => !requestBody[field]);
    
    if (missingFields.length > 0) {
      const errorMsg = `Faltan campos requeridos: ${missingFields.join(', ')}`;
      console.error(`❌ ${errorMsg}`);
      return createResponse(400, {
        error: 'Datos incompletos',
        message: errorMsg,
        requiredFields,
        receivedFields: Object.keys(requestBody)
      });
    }

    // Extraer datos del cuerpo de la solicitud
    const { fileName, fileData, fileType, transactionId } = requestBody;
    
    // Validar que fileData sea un string base64 válido
    if (typeof fileData !== 'string' || !fileData.startsWith('data:')) {
      const errorMsg = 'El campo fileData debe ser un string en formato base64';
      console.error(`❌ ${errorMsg}`);
      return createResponse(400, {
        error: 'Formato de archivo inválido',
        message: errorMsg,
        expectedFormat: 'data:[<mediatype>][;base64],<data>'
      });
    }

    // Verificar variables de entorno
    if (!supabaseUrl || !supabaseKey) {
      const errorMsg = '❌ Error: Variables de entorno de Supabase no configuradas';
      console.error(errorMsg);
      return createResponse(500, { 
        error: 'Error de configuración',
        details: errorMsg,
        solution: 'Configura las variables de entorno en Netlify: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY'
      });
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
    
    // Validar que los campos requeridos estén presentes
    if (!fileData) {
      const errorMsg = 'Datos del archivo no proporcionados';
      console.error(`❌ ${errorMsg}`);
      return createResponse(400, {
        error: 'Datos incompletos',
        message: errorMsg
      });
    }

    if (!transactionId) {
      const errorMsg = 'ID de transacción no proporcionado';
      console.error(`❌ ${errorMsg}`);
      return createResponse(400, {
        error: 'Datos incompletos',
        message: errorMsg
      });
    }

    console.log(`📤 Preparando para subir archivo: ${fileName} (${fileType || 'tipo no especificado'})`);

    try {
      // Extraer el contenido base64 (eliminar el prefijo data:...;base64,)
      const base64Data = fileData.split(';base64,').pop();
      console.log('🔄 Convirtiendo archivo a buffer...');
      
      const fileBuffer = Buffer.from(base64Data, 'base64');
      
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('No se pudo convertir el archivo a buffer o el buffer está vacío');
      }
      console.log(`✅ Archivo convertido a buffer (${fileBuffer.length} bytes)`);

      // Generar nombre único para el archivo
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${transactionId}/${timestamp}-${sanitizedFileName}`;
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
        const errorMsg = 'El bucket "documents" no existe en Supabase Storage';
        console.error(`❌ ${errorMsg}`);
        return createResponse(500, {
          error: 'Configuración incorrecta',
          message: errorMsg,
          solution: 'Por favor, crea un bucket llamado "documents" en Supabase Storage'
        });
      }
      
      // Determinar el tipo MIME del archivo
      let mimeType = 'application/octet-stream';
      if (fileType) {
        mimeType = fileType;
      } else if (fileName.includes('.')) {
        const extension = fileName.split('.').pop().toLowerCase();
        const mimeTypes = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        };
        mimeType = mimeTypes[extension] || 'application/octet-stream';
      }
      
      console.log(`📄 Tipo MIME detectado: ${mimeType}`);

      // Subir archivo a Supabase Storage
      console.log('⬆️  Subiendo archivo a Supabase Storage...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(uniqueFileName, fileBuffer, {
          contentType: mimeType,
          upsert: false,
          cacheControl: '3600',
          duplex: 'half'
        });

      if (uploadError) {
        console.error('❌ Error subiendo archivo a Supabase:', uploadError);
        
        // Verificar si el error es porque el archivo ya existe
        if (uploadError.message.includes('The resource already exists')) {
          return createResponse(409, {
            error: 'Archivo duplicado',
            message: 'Ya existe un archivo con el mismo nombre',
            solution: 'Intenta con un nombre de archivo diferente o elimina el archivo existente primero'
          });
        }
        
        // Verificar si el error es de permisos
        if (uploadError.message.includes('permission denied') || uploadError.message.includes('403')) {
          return createResponse(403, {
            error: 'Permiso denegado',
            message: 'No tienes permisos para subir archivos a este bucket',
            solution: 'Verifica que la clave de API tenga los permisos necesarios en Supabase Storage'
          });
        }
        
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
        console.error('URL Data:', urlData);
        
        // Aún así intentar construir la URL manualmente
        const manualUrl = `${supabaseUrl}/storage/v1/object/public/documents/${encodeURIComponent(uniqueFileName)}`;
        console.log('⚠️  Intentando con URL manual:', manualUrl);
        
        return createResponse(200, {
          success: true,
          fileName: uniqueFileName,
          url: manualUrl,
          warning: 'URL generada manualmente, verifica los permisos del bucket',
          details: 'La URL puede no funcionar si los permisos del bucket no están configurados correctamente'
        });
      }

      console.log('🌐 URL pública generada correctamente');
      
      // Construir respuesta exitosa
      const responseData = {
        success: true,
        fileName: uniqueFileName,
        url: urlData.publicUrl,
        size: fileBuffer.length,
        mimeType: mimeType,
        message: 'Archivo subido correctamente',
        timestamp: new Date().toISOString(),
        bucket: 'documents',
        path: uniqueFileName
      };
      
      console.log('📄 Detalles de la subida:', responseData);
      
      return createResponse(200, responseData);

    } catch (error) {
      console.error('❌ Error durante el proceso de subida:', error);
      
      // Intentar proporcionar más contexto sobre el error
      let errorDetails = {
        error: 'Error al procesar la solicitud',
        message: error.message,
        type: error.name || 'Error'
      };
      
      // Agregar detalles específicos para ciertos tipos de errores
      if (error.message.includes('ENOENT')) {
        errorDetails.details = 'No se pudo acceder al archivo o directorio';
      } else if (error.message.includes('EACCES')) {
        errorDetails.details = 'Permiso denegado al acceder al recurso';
        errorDetails.solution = 'Verifica los permisos del bucket y las credenciales de Supabase';
      } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
        errorDetails.details = 'Tiempo de espera agotado al conectar con el servidor';
        errorDetails.solution = 'Verifica tu conexión a internet y la URL de Supabase';
      }
      
      return createResponse(500, errorDetails);
    }

  } catch (error) {
    console.error('❌ Error crítico en upload-document:', error);
    
    // Respuesta de error genérica para errores inesperados
    return createResponse(500, {
      error: 'Error interno del servidor',
      message: 'Ocurrió un error inesperado al procesar la solicitud',
      requestId: context.awsRequestId,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
        stack: error.stack
      })
    });
  }
};
