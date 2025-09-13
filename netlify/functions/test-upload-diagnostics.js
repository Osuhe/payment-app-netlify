const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {},
    supabase: {},
    storage: {},
    errors: []
  };

  try {
    // 1. Verificar variables de entorno
    diagnostics.environment = {
      SUPABASE_URL: process.env.SUPABASE_URL ? '✅ Configurada' : '❌ Faltante',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Faltante',
      NODE_ENV: process.env.NODE_ENV || 'no definido'
    };

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      diagnostics.errors.push('Variables de entorno de Supabase faltantes');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify(diagnostics, null, 2)
      };
    }

    // 2. Probar conexión con Supabase
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    
    try {
      // Listar buckets
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        diagnostics.supabase.connection = '❌ Error de conexión';
        diagnostics.supabase.error = bucketsError.message;
        diagnostics.errors.push(`Error de conexión Supabase: ${bucketsError.message}`);
      } else {
        diagnostics.supabase.connection = '✅ Conectado';
        diagnostics.supabase.buckets = buckets.map(b => b.name);
        
        // Verificar bucket 'documentos'
        const documentosBucket = buckets.find(b => b.name === 'documentos');
        diagnostics.storage.documentos_bucket = documentosBucket ? '✅ Existe' : '❌ No existe';
        
        if (documentosBucket) {
          // Probar subida de archivo de prueba
          try {
            const testContent = `Test - ${Date.now()}`;
            const testFileName = `diagnostic_${Date.now()}.txt`;
            
            const { data: uploadData, error: uploadError } = await supabase.storage
              .from('documentos')
              .upload(testFileName, testContent, {
                contentType: 'text/plain'
              });
            
            if (uploadError) {
              diagnostics.storage.upload_test = '❌ Falló';
              diagnostics.storage.upload_error = uploadError.message;
              diagnostics.errors.push(`Error de subida: ${uploadError.message}`);
            } else {
              diagnostics.storage.upload_test = '✅ Exitoso';
              diagnostics.storage.test_file = uploadData.path;
              
              // Obtener URL pública
              const { data: urlData } = supabase.storage
                .from('documentos')
                .getPublicUrl(testFileName);
              
              diagnostics.storage.public_url = urlData.publicUrl;
              
              // Limpiar archivo de prueba
              await supabase.storage
                .from('documentos')
                .remove([testFileName]);
              
              diagnostics.storage.cleanup = '✅ Archivo de prueba eliminado';
            }
          } catch (testError) {
            diagnostics.storage.upload_test = '❌ Error en prueba';
            diagnostics.storage.test_error = testError.message;
            diagnostics.errors.push(`Error en prueba de subida: ${testError.message}`);
          }
        }
      }
    } catch (supabaseError) {
      diagnostics.supabase.connection = '❌ Error crítico';
      diagnostics.supabase.error = supabaseError.message;
      diagnostics.errors.push(`Error crítico Supabase: ${supabaseError.message}`);
    }

    // 3. Resumen final
    diagnostics.summary = {
      status: diagnostics.errors.length === 0 ? '✅ TODO OK' : '❌ HAY ERRORES',
      total_errors: diagnostics.errors.length,
      ready_for_upload: diagnostics.storage.upload_test === '✅ Exitoso'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostics, null, 2)
    };

  } catch (error) {
    diagnostics.errors.push(`Error general: ${error.message}`);
    diagnostics.summary = {
      status: '❌ ERROR CRÍTICO',
      error: error.message
    };

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(diagnostics, null, 2)
    };
  }
};
