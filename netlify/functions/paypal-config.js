exports.handler = async function(event, context) {
  // Configurar CORS restrictivo
  const headers = {
    'Access-Control-Allow-Origin': process.env.URL || 'https://stalwart-jelly-9deaab.netlify.app',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Manejar preflight request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Solo permitir GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Devolver solo el Client ID desde variables de entorno
    // El secret NUNCA debe exponerse al frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientId: process.env.PAYPAL_CLIENT_ID
      })
    };
  } catch (error) {
    console.error('Error getting PayPal config:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
