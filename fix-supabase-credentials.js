// Script para obtener las credenciales correctas de Supabase
console.log('🔍 Para arreglar la subida de documentos, necesito las credenciales correctas de Supabase.');
console.log('');
console.log('📋 PASOS PARA OBTENER LAS CREDENCIALES:');
console.log('');
console.log('1. Ve a https://supabase.com/dashboard');
console.log('2. Selecciona tu proyecto');
console.log('3. Ve a Settings > API');
console.log('4. Copia:');
console.log('   - Project URL');
console.log('   - anon/public key');
console.log('');
console.log('5. Crea un archivo .env con:');
console.log('   SUPABASE_URL=tu_project_url');
console.log('   SUPABASE_ANON_KEY=tu_anon_key');
console.log('');
console.log('6. O configúralas en Netlify Dashboard > Site settings > Environment variables');
console.log('');
console.log('🚨 IMPORTANTE: Sin las credenciales correctas, los documentos NO se pueden subir.');

// Verificar si ya existen las variables
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  console.log('');
  console.log('✅ Variables encontradas:');
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY.substring(0, 20) + '...');
  
  // Probar conexión
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  
  supabase.storage.listBuckets()
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Error de conexión:', error.message);
      } else {
        console.log('✅ Conexión exitosa. Buckets:', data.map(b => b.name));
      }
    })
    .catch(err => {
      console.log('❌ Error:', err.message);
    });
} else {
  console.log('');
  console.log('❌ Variables de entorno no encontradas.');
}
