// Script para configurar y probar Supabase Storage
const { createClient } = require('@supabase/supabase-js');

// Estas son las credenciales que vi en tu código anterior
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzE5NzksImV4cCI6MjA1MTUwNzk3OX0.Oa5Ej-Uy-Nt1Uf1Qr2aBNJjPqJGZGJGZGJGZGJGZGJG';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  console.log('🔗 Probando conexión con Supabase...');
  
  try {
    // 1. Probar conexión básica
    console.log('1️⃣ Verificando conexión básica...');
    
    // 2. Listar buckets disponibles
    console.log('2️⃣ Listando buckets de storage...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listando buckets:', bucketsError);
      return false;
    }
    
    console.log('📦 Buckets disponibles:', buckets.map(b => b.name));
    
    // 3. Verificar si existe el bucket 'documentos'
    const documentosBucket = buckets.find(b => b.name === 'documentos');
    if (!documentosBucket) {
      console.log('⚠️ Bucket "documentos" no existe, intentando crearlo...');
      
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('documentos', {
        public: true
      });
      
      if (createError) {
        console.error('❌ Error creando bucket:', createError);
        return false;
      }
      
      console.log('✅ Bucket "documentos" creado exitosamente');
    } else {
      console.log('✅ Bucket "documentos" ya existe');
    }
    
    // 4. Probar subida de archivo
    console.log('3️⃣ Probando subida de archivo...');
    const testContent = `Test file - ${new Date().toISOString()}`;
    const testFileName = `test_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documentos')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });
    
    if (uploadError) {
      console.error('❌ Error subiendo archivo:', uploadError);
      return false;
    }
    
    console.log('✅ Archivo subido exitosamente:', uploadData.path);
    
    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(testFileName);
    
    console.log('🔗 URL pública:', urlData.publicUrl);
    
    // 6. Limpiar archivo de prueba
    const { error: deleteError } = await supabase.storage
      .from('documentos')
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('⚠️ No se pudo eliminar archivo de prueba:', deleteError);
    } else {
      console.log('🗑️ Archivo de prueba eliminado');
    }
    
    console.log('\n🎉 ¡Supabase Storage está funcionando correctamente!');
    return true;
    
  } catch (error) {
    console.error('❌ Error general:', error);
    return false;
  }
}

async function createEnvFile() {
  const fs = require('fs');
  const envContent = `# Configuración de Supabase
SUPABASE_URL=${supabaseUrl}
SUPABASE_ANON_KEY=${supabaseKey}

# Token de administrador
ADMIN_TOKEN=admin-secure-token-2024

# Configuración de PayPal (reemplaza con tus valores reales)
PAYPAL_CLIENT_ID=tu_paypal_client_id_aqui
`;

  try {
    fs.writeFileSync('.env', envContent);
    console.log('✅ Archivo .env creado exitosamente');
  } catch (error) {
    console.error('❌ Error creando archivo .env:', error);
  }
}

async function main() {
  console.log('🚀 Configurando Supabase Storage...\n');
  
  const success = await testSupabaseConnection();
  
  if (success) {
    console.log('\n📝 Creando archivo .env...');
    await createEnvFile();
    
    console.log('\n✅ ¡Configuración completada!');
    console.log('📋 Próximos pasos:');
    console.log('1. Verifica que el archivo .env se creó correctamente');
    console.log('2. Configura las mismas variables en Netlify Dashboard');
    console.log('3. Prueba la subida de documentos en tu aplicación');
  } else {
    console.log('\n❌ Configuración falló. Revisa las credenciales de Supabase.');
  }
}

main();
