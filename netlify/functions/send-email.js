const sgMail = require('@sendgrid/mail');

exports.handler = async (event, context) => {
  // Configurar CORS restrictivo
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://stalwart-jelly-9deaab.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Manejar preflight request
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const data = JSON.parse(event.body);
    
    const {
      remitente_nombre,
      remitente_tel,
      remitente_email,
      benef_nombre,
      benef_ciudad,
      moneda,
      tasa,
      tarjeta_ultimos,
      orden_id,
      monto_usd,
      tarifa,
      total_cobrado,
      monto_depositar,
      paypal_order_id,
      estado,
      notas,
      timestamp
    } = data;

    // Email completamente seguro - dirección solo en backend
    const ADMIN_EMAIL = 'osuhe@icloud.com'; // Solo visible en el servidor
    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@tudominio.com';

    // Email para el administrador con todos los detalles
    const adminEmail = {
      to: ADMIN_EMAIL,
      from: FROM_EMAIL,
      subject: `Nueva orden de envío a Cuba - ${orden_id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c5aa0;">Nueva Orden de Envío a Cuba</h2>
          
          <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>📋 Información de la Orden</h3>
            <p><strong>Orden ID:</strong> ${orden_id}</p>
            <p><strong>PayPal ID:</strong> ${paypal_order_id}</p>
            <p><strong>Estado:</strong> ${estado}</p>
            <p><strong>Fecha:</strong> ${new Date(timestamp).toLocaleString()}</p>
          </div>

          <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>👤 Datos del Remitente</h3>
            <p><strong>Nombre:</strong> ${remitente_nombre}</p>
            <p><strong>Teléfono:</strong> ${remitente_tel}</p>
            <p><strong>Email:</strong> ${remitente_email}</p>
          </div>
          
          <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>🎯 Datos del Beneficiario</h3>
            <p><strong>Nombre:</strong> ${benef_nombre}</p>
            <p><strong>Ciudad:</strong> ${benef_ciudad}</p>
            <p><strong>Moneda:</strong> ${moneda}</p>
            <p><strong>Tasa aplicada:</strong> ${tasa} ${moneda}/USD</p>
            <p><strong>Tarjeta:</strong> **** **** **** ${tarjeta_ultimos}</p>
          </div>
          
          <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>💰 Detalles Financieros</h3>
            <p><strong>Monto USD:</strong> $${monto_usd}</p>
            <p><strong>Pago por envío:</strong> $${tarifa}</p>
            <p><strong>Total cobrado:</strong> $${total_cobrado}</p>
            <p style="font-size: 18px; color: #28a745;"><strong>Monto a depositar:</strong> ${monto_depositar} ${moneda}</p>
          </div>

          ${notas !== 'Ninguna' ? `
          <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <h3>📝 Notas</h3>
            <p>${notas}</p>
          </div>
          ` : ''}
          
          <div style="text-align: center; margin-top: 30px; padding: 20px; background: #28a745; color: white; border-radius: 5px;">
            <h3>✅ ACCIÓN REQUERIDA</h3>
            <p>Proceder con el depósito de <strong>${monto_depositar} ${moneda}</strong> en la tarjeta terminada en <strong>${tarjeta_ultimos}</strong></p>
          </div>
        </div>
      `
    };

    // Email de confirmación para el cliente (si proporcionó email)
    let clientEmail = null;
    if (remitente_email && remitente_email !== 'No proporcionado') {
      clientEmail = {
        to: remitente_email,
        from: FROM_EMAIL,
        subject: `Confirmación de envío a Cuba - ${orden_id}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;">✅ ¡Pago Confirmado!</h2>
            <p>Hola <strong>${remitente_nombre}</strong>,</p>
            <p>Tu pago ha sido procesado exitosamente. Aquí están los detalles:</p>
            
            <div style="background: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <h3>📋 Resumen de tu envío</h3>
              <p><strong>Orden ID:</strong> ${orden_id}</p>
              <p><strong>Beneficiario:</strong> ${benef_nombre}</p>
              <p><strong>Ciudad:</strong> ${benef_ciudad}</p>
              <p><strong>Monto enviado:</strong> $${monto_usd} USD</p>
              <p><strong>Total pagado:</strong> $${total_cobrado}</p>
              <p><strong>Monto a recibir:</strong> ${monto_depositar} ${moneda}</p>
            </div>
            
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Estado:</strong> Pago procesado correctamente</p>
              <p><strong>Tiempo estimado:</strong> El depósito se realizará en las próximas 24 horas</p>
            </div>
            
            <p>¡Gracias por confiar en nuestro servicio!</p>
          </div>
        `
      };
    }

    // Configurar SendGrid API Key
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY no configurada');
    }
    sgMail.setApiKey(apiKey);

    // Enviar emails
    await sgMail.send(adminEmail);
    if (clientEmail) {
      await sgMail.send(clientEmail);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Emails enviados correctamente',
        adminSent: true,
        clientSent: !!clientEmail,
        timestamp: timestamp
      })
    };

  } catch (error) {
    console.error('Error enviando email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error enviando email',
        details: error.message 
      })
    };
  }
};
