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

  try {
    console.log('🔍 Iniciando diagnóstico de variables de entorno...');
    
    // Verificar variables de entorno
    const envCheck = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_TOKEN: !!process.env.ADMIN_TOKEN,
      PAYPAL_CLIENT_ID: !!process.env.PAYPAL_CLIENT_ID,
      NODE_ENV: process.env.NODE_ENV || 'unknown'
    };

    console.log('Variables de entorno:', envCheck);

    // Intentar importar Supabase
    let supabaseStatus = 'No disponible';
    try {
      const { createClient } = require('@supabase/supabase-js');
      supabaseStatus = 'Módulo disponible';
      
      if (process.env.SUPABASE_URL && (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)) {
        const supabase = createClient(
          process.env.SUPABASE_URL, 
          process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
        );
        supabaseStatus = 'Cliente creado exitosamente';
      }
    } catch (error) {
      supabaseStatus = `Error: ${error.message}`;
    }

    const diagnostico = {
      timestamp: new Date().toISOString(),
      status: 'OK',
      environment: envCheck,
      supabase: supabaseStatus,
      function: 'debug-env',
      message: 'Diagnóstico completado'
    };

    console.log('✅ Diagnóstico completado:', diagnostico);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(diagnostico, null, 2)
    };

  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error en diagnóstico',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2)
    };
  }
};
