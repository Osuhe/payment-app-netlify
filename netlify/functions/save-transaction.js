const fs = require('fs').promises;
const path = require('path');

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
        notas: data.notas || 'Ninguna'
      };

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
