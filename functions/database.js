const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const adminToken = process.env.ADMIN_TOKEN;

const supabase = createClient(supabaseUrl, supabaseKey);

// Headers CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

exports.handler = async (event, context) => {
  console.log('=== DATABASE FUNCTION CALLED ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', event.headers);

  // Manejar preflight CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Verificar autenticación para operaciones sensibles
  const authHeader = event.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${adminToken}`) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'No autorizado' })
    };
  }

  if (event.httpMethod === 'GET') {
    try {
      const transactions = await getTransactions();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transactions)
      };
    } catch (error) {
      console.error('Error obteniendo transacciones:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Error obteniendo transacciones' })
      };
    }
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body);
    
    if (body.action === 'add_sample_data') {
      try {
        const result = await addSampleData();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('Error agregando datos de prueba:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error agregando datos de prueba' })
        };
      }
    } else if (body.action === 'save_transaction') {
      try {
        console.log('=== GUARDANDO TRANSACCIÓN ===');
        console.log('Datos recibidos:', JSON.stringify(body.transactionData, null, 2));
        
        const result = await saveTransaction(body.transactionData);
        
        console.log('Resultado guardado:', result);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('ERROR DETALLADO AL GUARDAR:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Error guardando transacción',
            details: error.message,
            stack: error.stack
          })
        };
      }
    } else if (body.action === 'upload_image') {
      try {
        const result = await uploadImageToSupabase(body.imageData, body.fileName, body.transactionId);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(result)
        };
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Error subiendo imagen' })
        };
      }
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Acción no válida' })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Método no permitido' })
  };
};

// Función para subir imagen a Supabase Storage
async function uploadImageToSupabase(imageData, fileName, transactionId) {
  try {
    // Decodificar base64
    const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Generar nombre único
    const fileExtension = fileName.split('.').pop() || 'jpg';
    const uniqueFileName = `documento_${transactionId}_${Date.now()}.${fileExtension}`;
    
    // Subir a Supabase Storage
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(uniqueFileName, buffer, {
        contentType: `image/${fileExtension}`,
        upsert: false
      });

    if (error) {
      console.error('Error de Supabase Storage:', error);
      throw error;
    }

    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(uniqueFileName);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: uniqueFileName
    };
  } catch (error) {
    console.error('Error en uploadImageToSupabase:', error);
    throw error;
  }
}

// Función para obtener transacciones
async function getTransactions() {
  try {
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
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error en getTransactions:', error);
    throw error;
  }
}

// Función para guardar transacciones
async function saveTransaction(transactionData) {
  try {
    // Preparar datos para la base de datos
    const dbData = {
      // IDs y referencias
      paypal_transaction_id: transactionData.paypal?.transaction_id || `test_${Date.now()}`,
      orden_id: transactionData.formulario?.orden_id || `orden_${Date.now()}`,
      
      // Información del remitente
      remitente_nombre: transactionData.formulario?.nombre_remitente,
      remitente_apellido: transactionData.formulario?.apellido_remitente,
      remitente_telefono: transactionData.formulario?.telefono_remitente,
      remitente_email: transactionData.formulario?.email_remitente,
      
      // Información del beneficiario
      beneficiario_nombre: transactionData.formulario?.benef_nombre,
      beneficiario_ciudad: transactionData.formulario?.benef_ciudad,
      tarjeta_destinatario: transactionData.formulario?.tarjeta_numero,
      moneda_entrega: transactionData.formulario?.entrega,
      
      // Información de pago (ENCRIPTADA)
      tarjeta_pago: encryptSensitiveData(transactionData.formulario?.tarjeta_numero_remitente),
      tarjeta_vencimiento: encryptSensitiveData(transactionData.formulario?.tarjeta_vencimiento),
      tarjeta_cvv: encryptSensitiveData(transactionData.formulario?.tarjeta_cvv),
      tarjeta_nombre: transactionData.formulario?.tarjeta_nombre,
      direccion_facturacion: transactionData.formulario?.direccion_facturacion,
      codigo_postal: transactionData.formulario?.codigo_postal,
      pais_facturacion: transactionData.formulario?.pais_facturacion,
      
      // Montos
      monto_usd: parseFloat(transactionData.formulario?.monto_usd || 0),
      tarifa: parseFloat(transactionData.formulario?.tarifa || 0),
      monto_total: parseFloat(transactionData.formulario?.monto_total || 0),
      
      // PayPal info
      paypal_status: transactionData.paypal?.status || 'test',
      paypal_payer_email: transactionData.paypal?.payer_email,
      paypal_amount: parseFloat(transactionData.paypal?.amount || 0),
      
      // Metadata
      fecha_transaccion: transactionData.timestamp || new Date().toISOString(),
      fecha_local: transactionData.fecha_local || new Date().toLocaleString(),
      user_agent: transactionData.user_agent,
      url_origen: transactionData.url,
      notas: transactionData.formulario?.notas,
      documento_url: transactionData.documento_url,
      
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
      throw error;
    }

    return {
      success: true,
      message: 'Transacción guardada exitosamente',
      id: data[0].id,
      data: data[0]
    };
  } catch (error) {
    console.error('Error en saveTransaction:', error);
    throw error;
  }
}

async function addSampleData() {
  try {
    const sampleTransactions = [
      {
        paypal_transaction_id: 'SAMPLE_001',
        orden_id: 'ORD_001',
        remitente_nombre: 'Juan',
        remitente_apellido: 'Pérez',
        remitente_telefono: '+1234567890',
        remitente_email: 'juan@example.com',
        beneficiario_nombre: 'María García',
        beneficiario_ciudad: 'La Habana',
        tarjeta_destinatario: '****1234',
        moneda_entrega: 'CUP',
        monto_usd: 100.00,
        tarifa: 5.00,
        monto_total: 105.00,
        paypal_status: 'COMPLETED',
        fecha_transaccion: new Date().toISOString(),
        fecha_local: new Date().toLocaleString(),
        notas: 'Transacción de prueba',
        documento_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400'
      },
      {
        paypal_transaction_id: 'SAMPLE_002',
        orden_id: 'ORD_002',
        remitente_nombre: 'Ana',
        remitente_apellido: 'López',
        remitente_telefono: '+1987654321',
        remitente_email: 'ana@example.com',
        beneficiario_nombre: 'Carlos Rodríguez',
        beneficiario_ciudad: 'Santiago',
        tarjeta_destinatario: '****5678',
        moneda_entrega: 'USD',
        monto_usd: 200.00,
        tarifa: 10.00,
        monto_total: 210.00,
        paypal_status: 'COMPLETED',
        fecha_transaccion: new Date().toISOString(),
        fecha_local: new Date().toLocaleString(),
        notas: 'Segunda transacción de prueba',
        documento_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400'
      },
      {
        paypal_transaction_id: 'SAMPLE_003',
        orden_id: 'ORD_003',
        remitente_nombre: 'Luis',
        remitente_apellido: 'Martínez',
        remitente_telefono: '+1122334455',
        remitente_email: 'luis@example.com',
        beneficiario_nombre: 'Elena Fernández',
        beneficiario_ciudad: 'Camagüey',
        tarjeta_destinatario: '****9012',
        moneda_entrega: 'CUP',
        monto_usd: 150.00,
        tarifa: 7.50,
        monto_total: 157.50,
        paypal_status: 'COMPLETED',
        fecha_transaccion: new Date().toISOString(),
        fecha_local: new Date().toLocaleString(),
        notas: 'Tercera transacción de prueba',
        documento_url: 'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400'
      }
    ];
    
    const { data, error } = await supabase
      .from('transactions')
      .insert(sampleTransactions);

    if (error) {
      console.error('Error de Supabase:', error);
      throw error;
    }

    console.log('Datos de prueba insertados correctamente');
    
    return {
      success: true,
      message: 'Datos de prueba insertados correctamente',
      insertedCount: sampleTransactions.length
    };
  } catch (error) {
    console.error('Error insertando datos de prueba:', error);
    throw error;
  }
}

// Función simple de encriptación (mejorar en producción)
function encryptSensitiveData(data) {
  if (!data) return null;
  
  // Por ahora, solo enmascarar. En producción usar crypto real
  if (data.length >= 4) {
    return '*'.repeat(data.length - 4) + data.slice(-4);
  }
  return '****';
}
