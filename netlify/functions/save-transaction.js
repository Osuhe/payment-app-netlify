const fs = require('fs').promises;
const path = require('path');
const sgMail = require('@sendgrid/mail');
const fetch = require('node-fetch');

// Configurar SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Función para descargar un archivo desde una URL
async function descargarArchivo(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Error al descargar el archivo: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

// Función para enviar correo de notificación de transacción
async function enviarNotificacionTransaccion(transaccion) {
  try {
    const msg = {
      to: process.env.EMAIL_NOTIFICACIONES || 'tu-email@ejemplo.com',
      from: process.env.EMAIL_FROM || 'notificaciones@tudominio.com',
      subject: `Nueva transacción #${transaccion.orden_id}`,
      html: `
        <h2>Nueva transacción registrada</h2>
        <p><strong>ID de Orden:</strong> ${transaccion.orden_id}</p>
        <p><strong>Estado:</strong> ${transaccion.estado}</p>
        <p><strong>Remitente:</strong> ${transaccion.remitente_nombre}</p>
        <p><strong>Email:</strong> ${transaccion.remitente_email}</p>
        <p><strong>Teléfono:</strong> ${transaccion.remitente_tel}</p>
        <p><strong>Beneficiario:</strong> ${transaccion.benef_nombre}</p>
        <p><strong>Ciudad:</strong> ${transaccion.benef_ciudad}</p>
        <p><strong>Monto USD:</strong> $${transaccion.monto_usd}</p>
        <p><strong>Total Cobrado:</strong> $${transaccion.total_cobrado}</p>
        <p><strong>Monto a Depositar:</strong> $${transaccion.monto_depositar}</p>
        <p><strong>Notas:</strong> ${transaccion.notas}</p>
        <p><strong>Fecha:</strong> ${new Date(transaccion.timestamp).toLocaleString()}</p>
        ${transaccion.documento_url ? `
          <p><strong>Documento adjunto:</strong> Ver en el correo electrónico</p>
          <p><em>Se ha adjuntado el documento de identidad a este correo.</em></p>
        ` : '<p><em>No se adjuntó documento de identidad.</em></p>'}
      `,
      text: `
        Nueva transacción registrada
        
        ID de Orden: ${transaccion.orden_id}
        Estado: ${transaccion.estado}
        Remitente: ${transaccion.remitente_nombre}
        Email: ${transaccion.remitente_email}
        Teléfono: ${transaccion.remitente_tel}
        Beneficiario: ${transaccion.benef_nombre}
        Ciudad: ${transaccion.benef_ciudad}
        Monto USD: $${transaccion.monto_usd}
        Total Cobrado: $${transaccion.total_cobrado}
        Monto a Depositar: $${transaccion.monto_depositar}
        Notas: ${transaccion.notas}
        Fecha: ${new Date(transaccion.timestamp).toLocaleString()}
        Documento: ${transaccion.documento_url ? 'Adjunto al correo' : 'No se adjuntó documento'}
      `,
      attachments: []
    };

    // Si hay una URL de documento, descargarla y adjuntarla
    if (transaccion.documento_url) {
      try {
        console.log('Descargando documento de:', transaccion.documento_url);
        const fileData = await descargarArchivo(transaccion.documento_url);
        
        // Obtener la extensión del archivo de la URL
        const extension = transaccion.documento_url.split('.').pop().split('?')[0];
        const fileName = `documento_${transaccion.orden_id}.${extension}`;
        
        msg.attachments.push({
          content: fileData.toString('base64'),
          filename: fileName,
          type: `image/${extension}`, // Ajusta según el tipo de archivo
          disposition: 'attachment'
        });
        
        console.log('Documento adjuntado correctamente');
      } catch (error) {
        console.error('Error al adjuntar documento:', error);
        // Continuar con el envío del correo aunque falle el adjunto
      }
    }

    await sgMail.send(msg);
    console.log('Correo de notificación enviado');
  } catch (error) {
    console.error('Error al enviar correo de notificación:', error);
    // No lanzamos el error para no interrumpir el flujo principal
  }
}

exports.handler = async (event, context) => {
  // Configurar CORS restrictivo
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://stalwart-jelly-9deaab.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };

  // Manejar preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const data = JSON.parse(event.body);
      
      // Crear registro de transacción
      const transaction = {
        timestamp: new Date().toISOString(),
        orden_id: data.orden_id,
        paypal_order_id: data.paypal_order_id,
        estado: data.estado || 'COMPLETED',
        remitente_nombre: data.remitente_nombre,
        remitente_tel: data.remitente_tel,
        remitente_email: data.remitente_email || 'No proporcionado',
        benef_nombre: data.benef_nombre,
        benef_ciudad: data.benef_ciudad,
        moneda: data.entrega,
        tasa: data.tasa,
        tarjeta_ultimos: data.tarjeta_numero ? data.tarjeta_numero.slice(-4) : '',
        monto_usd: data.monto_usd,
        tarifa: data.tarifa,
        total_cobrado: data.monto_total,
        monto_depositar: data.monto_usd * (data.tasa || 1),
        notas: data.notas || 'Ninguna',
        documento_url: data.documento_url || null  // Asegurarse de incluir la URL del documento
      };
      
      console.log('Datos de la transacción:', JSON.stringify(transaction, null, 2));

      // Convertir a CSV
      const csvHeader = 'Fecha,Orden ID,PayPal ID,Estado,Remitente,Teléfono,Email,Beneficiario,Ciudad,Moneda,Tasa,Tarjeta,Monto USD,Tarifa,Total Cobrado,Monto Depositar,Notas\n';
      const csvRow = [
        transaction.timestamp,
        transaction.orden_id,
        transaction.paypal_order_id,
        transaction.estado,
        `"${transaction.remitente_nombre}"`,
        transaction.remitente_tel,
        `"${transaction.remitente_email}"`,
        `"${transaction.benef_nombre}"`,
        `"${transaction.benef_ciudad}"`,
        transaction.moneda,
        transaction.tasa,
        transaction.tarjeta_ultimos,
        transaction.monto_usd,
        transaction.tarifa,
        transaction.total_cobrado,
        transaction.monto_depositar,
        `"${transaction.notas}"`
      ].join(',') + '\n';

      // Usar variable de entorno para almacenar transacciones
      const existingData = process.env.TRANSACTIONS_DATA || '';
      const newData = existingData + csvRow;
      
      // En un entorno real, aquí usarías una base de datos
      // Por ahora, almacenamos en memoria durante la ejecución
      global.transactionsData = global.transactionsData || csvHeader;
      global.transactionsData += csvRow;

      // Enviar notificación por correo
      await enviarNotificacionTransaccion(transaction);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          message: 'Transacción guardada correctamente',
          transaction_id: transaction.orden_id,
          timestamp: transaction.timestamp
        })
      };

    } catch (error) {
      console.error('Error guardando transacción:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Error guardando transacción',
          details: error.message 
        })
      };
    }
  }

  // GET - Obtener transacciones como JSON o CSV
  if (event.httpMethod === 'GET') {
    try {
      const format = event.queryStringParameters?.format || 'json';
      const csvData = global.transactionsData || 'Fecha,Orden ID,PayPal ID,Estado,Remitente,Teléfono,Email,Beneficiario,Ciudad,Moneda,Tasa,Tarjeta,Monto USD,Tarifa,Total Cobrado,Monto Depositar,Notas\n';
      
      if (format === 'csv') {
        return {
          statusCode: 200,
          headers: {
            ...headers,
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="transacciones.csv"'
          },
          body: csvData
        };
      } else {
        // Convertir CSV a JSON para mostrar en el panel
        const lines = csvData.split('\n').filter(line => line.trim());
        const header = lines[0].split(',');
        const transactions = lines.slice(1).map(line => {
          const values = line.split(',');
          const transaction = {};
          header.forEach((key, index) => {
            transaction[key] = values[index]?.replace(/"/g, '') || '';
          });
          return transaction;
        });
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            transactions,
            total: transactions.length,
            totalAmount: transactions.reduce((sum, t) => sum + parseFloat(t['Total Cobrado'] || 0), 0),
            totalFees: transactions.reduce((sum, t) => sum + parseFloat(t['Tarifa'] || 0), 0)
          })
        };
      }
    } catch (error) {
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

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
