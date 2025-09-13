// Script directo para subir un archivo a Supabase usando las credenciales reales
const { createClient } = require('@supabase/supabase-js');

// Credenciales reales proporcionadas por el usuario
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadTestFile() {
  try {
    console.log('🚀 Iniciando subida directa...');
    
    // Crear contenido de prueba
    const testContent = `Documento de prueba subido el ${new Date().toISOString()}`;
    const fileName = `test_documento_${Date.now()}.txt`;
    
    console.log('📤 Subiendo archivo:', fileName);
    
    // Subir directamente
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(fileName, testContent, {
        contentType: 'text/plain'
      });

    if (error) {
      console.error('❌ Error:', error);
      
      // Si el bucket no existe, crearlo
      if (error.message.includes('Bucket not found')) {
        console.log('📦 Creando bucket documentos...');
        
        const { error: createError } = await supabase.storage.createBucket('documentos', {
          public: true
        });
        
        if (createError) {
          console.error('❌ Error creando bucket:', createError);
          return;
        }
        
        console.log('✅ Bucket creado, reintentando subida...');
        
        // Reintentar subida
        const { data: retryData, error: retryError } = await supabase.storage
          .from('documentos')
          .upload(fileName, testContent, {
            contentType: 'text/plain'
          });
        
        if (retryError) {
          console.error('❌ Error en reintento:', retryError);
          return;
        }
        
        console.log('✅ Archivo subido en reintento:', retryData);
      }
    } else {
      console.log('✅ Archivo subido exitosamente:', data);
    }
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(fileName);
    
    console.log('🔗 URL pública:', urlData.publicUrl);
    
    // Verificar que el archivo existe
    const { data: listData, error: listError } = await supabase.storage
      .from('documentos')
      .list();
    
    if (listError) {
      console.error('❌ Error listando archivos:', listError);
    } else {
      console.log('📋 Archivos en bucket:', listData.map(f => f.name));
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

uploadTestFile();
