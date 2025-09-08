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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método no permitido' })
    };
  }

  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      supabase_config: {
        url: supabaseUrl ? 'Configurada' : 'Falta',
        key: supabaseKey ? 'Configurada' : 'Falta'
      },
      tests: {}
    };

    // Test 1: Verificar conexión a Supabase
    try {
      const { data, error } = await supabase.from('transactions').select('count').limit(1);
      diagnostics.tests.database_connection = {
        status: error ? 'ERROR' : 'OK',
        message: error ? error.message : 'Conexión exitosa a la base de datos'
      };
    } catch (err) {
      diagnostics.tests.database_connection = {
        status: 'ERROR',
        message: err.message
      };
    }

    // Test 2: Verificar bucket 'documentos'
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      const documentosBucket = buckets?.find(b => b.id === 'documentos');
      
      diagnostics.tests.storage_bucket = {
        status: documentosBucket ? 'OK' : 'ERROR',
        message: documentosBucket ? 
          `Bucket 'documentos' existe (público: ${documentosBucket.public})` : 
          'Bucket "documentos" no encontrado',
        all_buckets: buckets?.map(b => b.id) || []
      };
    } catch (err) {
      diagnostics.tests.storage_bucket = {
        status: 'ERROR',
        message: err.message
      };
    }

    // Test 3: Listar archivos en el bucket
    try {
      const { data: files, error } = await supabase.storage
        .from('documentos')
        .list('', { limit: 10 });
      
      diagnostics.tests.storage_files = {
        status: error ? 'ERROR' : 'OK',
        message: error ? error.message : `${files?.length || 0} archivos encontrados`,
        files: files?.map(f => ({
          name: f.name,
          size: f.metadata?.size,
          created: f.created_at
        })) || []
      };
    } catch (err) {
      diagnostics.tests.storage_files = {
        status: 'ERROR',
        message: err.message
      };
    }

    // Test 4: Intentar subir un archivo de prueba
    try {
      const testContent = 'test-file-content';
      const testFileName = `test_${Date.now()}.txt`;
      
      const { data, error } = await supabase.storage
        .from('documentos')
        .upload(testFileName, testContent, {
          contentType: 'text/plain'
        });

      if (!error) {
        // Limpiar el archivo de prueba
        await supabase.storage
          .from('documentos')
          .remove([testFileName]);
      }

      diagnostics.tests.storage_upload = {
        status: error ? 'ERROR' : 'OK',
        message: error ? error.message : 'Upload test exitoso'
      };
    } catch (err) {
      diagnostics.tests.storage_upload = {
        status: 'ERROR',
        message: err.message
      };
    }

    // Resumen general
    const allTests = Object.values(diagnostics.tests);
    const errorCount = allTests.filter(t => t.status === 'ERROR').length;
    
    diagnostics.summary = {
      total_tests: allTests.length,
      errors: errorCount,
      status: errorCount === 0 ? 'ALL_OK' : 'ISSUES_FOUND'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostics, null, 2)
    };

  } catch (error) {
    console.error('Error en test-storage function:', error);
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
