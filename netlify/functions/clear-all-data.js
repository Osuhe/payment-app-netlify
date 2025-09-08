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

    const results = {
      timestamp: new Date().toISOString(),
      operations: []
    };

    // 1. Eliminar todas las imágenes del bucket 'documentos'
    try {
      const { data: files, error: listError } = await supabase.storage
        .from('documentos')
        .list('', { limit: 1000 });

      if (listError) {
        throw new Error(`Error listando archivos: ${listError.message}`);
      }

      if (files && files.length > 0) {
        const fileNames = files.map(file => file.name);
        
        const { data: deleteData, error: deleteError } = await supabase.storage
          .from('documentos')
          .remove(fileNames);

        if (deleteError) {
          throw new Error(`Error eliminando archivos: ${deleteError.message}`);
        }

        results.operations.push({
          operation: 'delete_storage_files',
          status: 'success',
          count: fileNames.length,
          files: fileNames
        });
      } else {
        results.operations.push({
          operation: 'delete_storage_files',
          status: 'success',
          count: 0,
          message: 'No hay archivos para eliminar'
        });
      }
    } catch (storageError) {
      results.operations.push({
        operation: 'delete_storage_files',
        status: 'error',
        error: storageError.message
      });
    }

    // 2. Eliminar todas las transacciones de la base de datos
    try {
      const { data, error } = await supabase
        .from('transactions')
        .delete()
        .neq('id', 0); // Eliminar todos los registros

      if (error) {
        throw new Error(`Error eliminando transacciones: ${error.message}`);
      }

      results.operations.push({
        operation: 'delete_transactions',
        status: 'success',
        message: 'Todas las transacciones eliminadas'
      });
    } catch (dbError) {
      results.operations.push({
        operation: 'delete_transactions',
        status: 'error',
        error: dbError.message
      });
    }

    // 3. Verificar que todo esté limpio
    try {
      // Contar transacciones restantes
      const { count: transactionCount, error: countError } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Error contando transacciones: ${countError.message}`);
      }

      // Contar archivos restantes
      const { data: remainingFiles, error: filesError } = await supabase.storage
        .from('documentos')
        .list('', { limit: 10 });

      if (filesError) {
        throw new Error(`Error verificando archivos: ${filesError.message}`);
      }

      results.operations.push({
        operation: 'verification',
        status: 'success',
        remaining_transactions: transactionCount || 0,
        remaining_files: remainingFiles ? remainingFiles.length : 0
      });
    } catch (verifyError) {
      results.operations.push({
        operation: 'verification',
        status: 'error',
        error: verifyError.message
      });
    }

    // Resumen final
    const errors = results.operations.filter(op => op.status === 'error');
    results.summary = {
      total_operations: results.operations.length,
      successful: results.operations.length - errors.length,
      errors: errors.length,
      status: errors.length === 0 ? 'ALL_CLEARED' : 'PARTIAL_SUCCESS'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('Error en clear-all-data function:', error);
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
