const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Faltan variables de entorno de Supabase');
}

const supabase = createClient(supabaseUrl, supabaseKey);

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://stalwart-jelly-9deaab.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };

  // Manejar preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Verificar autenticación básica
    const authHeader = event.headers.authorization;
    if (!authHeader || !isValidAdmin(authHeader)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado' })
      };
    }

    // Datos de ejemplo con documentos
    const sampleData = [
      {
        paypal_transaction_id: 'PAYID-SAMPLE-001',
        orden_id: 'ORD-001-2024',
        remitente_nombre: 'Juan',
        remitente_apellido: 'Pérez',
        remitente_telefono: '+1-555-0123',
        remitente_email: 'juan.perez@email.com',
        beneficiario_nombre: 'María González',
        beneficiario_ciudad: 'La Habana',
        tarjeta_destinatario: '9205123456789012',
        moneda_entrega: 'CUP',
        tarjeta_pago: '**** **** **** 1234',
        tarjeta_vencimiento: '**/**',
        tarjeta_cvv: '***',
        tarjeta_nombre: 'Juan Perez',
        direccion_facturacion: '123 Main St, Miami, FL',
        codigo_postal: '33101',
        pais_facturacion: 'US',
        monto_usd: 250.00,
        tarifa: 7.50,
        monto_total: 257.50,
        paypal_status: 'COMPLETED',
        paypal_payer_email: 'juan.perez@email.com',
        paypal_amount: 257.50,
        fecha_transaccion: new Date().toISOString(),
        fecha_local: new Date().toLocaleString(),
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        url_origen: 'https://stalwart-jelly-9deaab.netlify.app',
        notas: 'Envío urgente para medicinas',
        documento_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop&crop=face',
        datos_completos: {
          tipo_documento: 'Pasaporte',
          numero_documento: 'A12345678',
          fecha_vencimiento: '2030-12-31'
        }
      },
      {
        paypal_transaction_id: 'PAYID-SAMPLE-002',
        orden_id: 'ORD-002-2024',
        remitente_nombre: 'Carlos',
        remitente_apellido: 'López',
        remitente_telefono: '+1-555-0456',
        remitente_email: 'carlos.lopez@email.com',
        beneficiario_nombre: 'Ana Martínez',
        beneficiario_ciudad: 'Santiago de Cuba',
        tarjeta_destinatario: '9205987654321098',
        moneda_entrega: 'MLC',
        tarjeta_pago: '**** **** **** 5678',
        tarjeta_vencimiento: '**/**',
        tarjeta_cvv: '***',
        tarjeta_nombre: 'Carlos Lopez',
        direccion_facturacion: '456 Ocean Dr, Miami Beach, FL',
        codigo_postal: '33139',
        pais_facturacion: 'US',
        monto_usd: 300.00,
        tarifa: 9.00,
        monto_total: 309.00,
        paypal_status: 'COMPLETED',
        paypal_payer_email: 'carlos.lopez@email.com',
        paypal_amount: 309.00,
        fecha_transaccion: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        fecha_local: new Date(Date.now() - 2 * 60 * 60 * 1000).toLocaleString(),
        user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        url_origen: 'https://stalwart-jelly-9deaab.netlify.app',
        notas: 'Cumpleaños de la familia',
        documento_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop&crop=face',
        datos_completos: {
          tipo_documento: 'Licencia de Conducir',
          numero_documento: 'DL987654321',
          fecha_vencimiento: '2028-06-15'
        }
      },
      {
        paypal_transaction_id: 'PAYID-SAMPLE-003',
        orden_id: 'ORD-003-2024',
        remitente_nombre: 'Luis',
        remitente_apellido: 'Rodríguez',
        remitente_telefono: '+1-555-0789',
        remitente_email: 'luis.rodriguez@email.com',
        beneficiario_nombre: 'Carmen Silva',
        beneficiario_ciudad: 'Camagüey',
        tarjeta_destinatario: '9205555444433332',
        moneda_entrega: 'CUP',
        tarjeta_pago: '**** **** **** 9999',
        tarjeta_vencimiento: '**/**',
        tarjeta_cvv: '***',
        tarjeta_nombre: 'Luis Rodriguez',
        direccion_facturacion: '789 Biscayne Blvd, Miami, FL',
        codigo_postal: '33132',
        pais_facturacion: 'US',
        monto_usd: 200.00,
        tarifa: 6.00,
        monto_total: 206.00,
        paypal_status: 'COMPLETED',
        paypal_payer_email: 'luis.rodriguez@email.com',
        paypal_amount: 206.00,
        fecha_transaccion: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutos atrás
        fecha_local: new Date(Date.now() - 30 * 60 * 1000).toLocaleString(),
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        url_origen: 'https://stalwart-jelly-9deaab.netlify.app',
        notas: 'Gastos médicos urgentes',
        documento_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop&crop=face',
        datos_completos: {
          tipo_documento: 'Cédula de Identidad',
          numero_documento: 'CI123456789',
          fecha_vencimiento: '2029-03-20'
        }
      }
    ];

    // Insertar datos de ejemplo en Supabase
    const { data, error } = await supabase
      .from('transactions')
      .insert(sampleData)
      .select();

    if (error) {
      console.error('Error insertando datos de ejemplo:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error insertando datos de ejemplo',
          details: error.message 
        })
      };
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({ 
        success: true,
        message: 'Datos de ejemplo insertados correctamente',
        count: data.length,
        data: data
      })
    };

  } catch (error) {
    console.error('Error en función add-sample-data:', error);
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

// Validación básica de admin
function isValidAdmin(authHeader) {
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_TOKEN;
}
