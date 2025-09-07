const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verificar autenticación para admin
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Token de autorización requerido' })
      };
    }

    const token = authHeader.split(' ')[1];
    if (token !== process.env.ADMIN_TOKEN) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Token de autorización inválido' })
      };
    }

    if (event.httpMethod === 'GET') {
      return await getTransactions();
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body);
      
      // Verificar si es una solicitud para agregar datos de prueba
      if (body.action === 'add_sample_data') {
        return await addSampleData(body.data);
      } else {
        return await saveTransaction(event.body);
      }
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Método no permitido' })
      };
    }
  } catch (error) {
    console.error('Error en database function:', error);
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

// Crear nueva transacción
async function createTransaction(event, headers) {
  try {
    const transactionData = JSON.parse(event.body);
    
    // Validar datos requeridos
    if (!transactionData.formulario || !transactionData.paypal) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Datos de transacción incompletos' })
      };
    }

    // Preparar datos para la base de datos
    const dbData = {
      // IDs y referencias
      paypal_transaction_id: transactionData.paypal.transaction_id,
      orden_id: transactionData.formulario.orden_id,
      
      // Información del remitente
      remitente_nombre: transactionData.formulario.nombre_remitente,
      remitente_apellido: transactionData.formulario.apellido_remitente,
      remitente_telefono: transactionData.formulario.telefono_remitente,
      remitente_email: transactionData.formulario.email_remitente,
      
      // Información del beneficiario
      beneficiario_nombre: transactionData.formulario.benef_nombre,
      beneficiario_ciudad: transactionData.formulario.benef_ciudad,
      tarjeta_destinatario: transactionData.formulario.tarjeta_numero,
      moneda_entrega: transactionData.formulario.entrega,
      
      // Información de pago (ENCRIPTADA)
      tarjeta_pago: encryptSensitiveData(transactionData.formulario.tarjeta_numero_remitente),
      tarjeta_vencimiento: encryptSensitiveData(transactionData.formulario.tarjeta_vencimiento),
      tarjeta_cvv: encryptSensitiveData(transactionData.formulario.tarjeta_cvv),
      tarjeta_nombre: transactionData.formulario.tarjeta_nombre,
      direccion_facturacion: transactionData.formulario.direccion_facturacion,
      codigo_postal: transactionData.formulario.codigo_postal,
      pais_facturacion: transactionData.formulario.pais_facturacion,
      
      // Montos
      monto_usd: parseFloat(transactionData.formulario.monto_usd),
      tarifa: parseFloat(transactionData.formulario.tarifa),
      monto_total: parseFloat(transactionData.formulario.monto_total),
      
      // PayPal info
      paypal_status: transactionData.paypal.status,
      paypal_payer_email: transactionData.paypal.payer_email,
      paypal_amount: parseFloat(transactionData.paypal.amount),
      
      // Metadata
      fecha_transaccion: transactionData.timestamp,
      fecha_local: transactionData.fecha_local,
      user_agent: transactionData.user_agent,
      url_origen: transactionData.url,
      notas: transactionData.formulario.notas,
      
      // Datos completos (para respaldo)
      datos_completos: transactionData
    };

    // Insertar en Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert([dbData])
      .select();

    if (error) {
      console.error('Error insertando en Supabase:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error guardando transacción',
          details: error.message 
        })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Transacción guardada exitosamente',
        id: data[0].id
      })
    };

  } catch (error) {
    console.error('Error procesando transacción:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error procesando transacción',
        details: error.message 
      })
    };
  }
}

// Obtener transacciones (solo para admin)
async function getTransactions(event, headers) {
  try {
    // Verificar autenticación básica (mejorar en producción)
    const authHeader = event.headers.authorization;
    if (!authHeader || !isValidAdmin(authHeader)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado' })
      };
    }

    // Obtener transacciones de Supabase
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        id,
        paypal_transaction_id,
        orden_id,
        remitente_nombre,
        remitente_apellido,
        remitente_telefono,
        remitente_email,
        beneficiario_nombre,
        beneficiario_ciudad,
        tarjeta_destinatario,
        moneda_entrega,
        monto_usd,
        tarifa,
        monto_total,
        paypal_status,
        fecha_transaccion,
        fecha_local,
        notas,
        documento_url
      `)
      .order('fecha_transaccion', { ascending: false });

    if (error) {
      console.error('Error obteniendo transacciones:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error obteniendo transacciones',
          details: error.message 
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        transactions: data || []
      })
    };

  } catch (error) {
    console.error('Error obteniendo transacciones:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error obteniendo transacciones',
        details: error.message 
      })
    };
  }
}

async function addSampleData(sampleTransactions) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  try {
    console.log('Insertando datos de prueba:', sampleTransactions.length, 'transacciones');
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(sampleTransactions);

    if (error) {
      console.error('Error de Supabase:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Error al insertar datos de prueba',
          details: error.message 
        })
      };
    }

    console.log('Datos de prueba insertados correctamente');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Datos de prueba insertados correctamente',
        insertedCount: sampleTransactions.length
      })
    };
  } catch (error) {
    console.error('Error insertando datos de prueba:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Error interno al insertar datos de prueba',
        details: error.message 
      })
    };
  }
}

// Función simple de encriptación (mejorar en producción)
function encryptSensitiveData(data) {
  if (!data) return null;
  
  // Por ahora, solo enmascarar. En producción usar crypto real
  if (data.length >= 4) {
    return '*'.repeat(data.length - 4) + data.slice(-4);
  }
  return '*'.repeat(data.length);
}

// Validación básica de admin (mejorar en producción)
function isValidAdmin(authHeader) {
  // Extraer token básico
  const token = authHeader.replace('Bearer ', '');
  
  // Validar contra variable de entorno
  return token === process.env.ADMIN_TOKEN;
}
