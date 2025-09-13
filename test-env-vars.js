// Script para verificar las variables de entorno de Supabase
console.log('🔍 Verificando variables de entorno...');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Configurada' : '❌ No encontrada');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No encontrada');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.log('\n📋 SOLUCIÓN:');
  console.log('1. Crea un archivo .env en la raíz del proyecto');
  console.log('2. Agrega las siguientes líneas:');
  console.log('   SUPABASE_URL=tu_url_de_supabase');
  console.log('   SUPABASE_ANON_KEY=tu_clave_anonima');
  console.log('3. O configura las variables en Netlify Dashboard');
}

// Mostrar las funciones disponibles
const fs = require('fs');
const path = require('path');

console.log('\n📁 Funciones disponibles:');
const functionsDir = path.join(__dirname, 'netlify', 'functions');
if (fs.existsSync(functionsDir)) {
  const files = fs.readdirSync(functionsDir);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      console.log(`  - ${file}`);
    }
  });
} else {
  console.log('❌ Directorio netlify/functions no encontrado');
}
