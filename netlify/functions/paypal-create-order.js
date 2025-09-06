const paypal = require('@paypal/checkout-server-sdk');

exports.handler = async function(event, context) {
  // Validar método HTTP
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Configurar el entorno de PayPal
    const environment = new paypal.core.SandboxEnvironment(
      process.env.PAYPAL_CLIENT_ID,
      process.env.PAYPAL_SECRET
    );
    const client = new paypal.core.PayPalHttpClient(environment);

    // Obtener el monto del cuerpo de la solicitud
    const { monto } = JSON.parse(event.body);
    
    // Crear la orden
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: monto.toString(),
        },
        description: 'Recarga de saldo',
      }],
      application_context: {
        brand_name: 'Tu Empresa',
        landing_page: 'PAYMENT',
        user_action: 'PAY_NOW',
        return_url: `${process.env.URL}/gracias`,
        cancel_url: `${process.env.URL}/`,
      },
    });

    // Enviar la solicitud a PayPal
    const response = await client.execute(request);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ id: response.result.id })
    };
    
  } catch (error) {
    console.error('Error al crear la orden de PayPal:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error al procesar el pago' })
    };
  }
};
