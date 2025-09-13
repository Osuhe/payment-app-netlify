// Script simple para probar la subida de documentos
const { createClient } = require('@supabase/supabase-js');

// Configuración directa (reemplaza con tus valores reales)
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU5MzE5NzksImV4cCI6MjA1MTUwNzk3OX0.Oa5Ej-Uy-Nt1Uf1Qr2aBNJjPqJGZGJGZGJGZGJGZGJG';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  try {
    console.log('🧪 Probando conexión con Supabase Storage...');
    
    // Crear un archivo de prueba simple
    const testContent = 'Archivo de prueba - ' + new Date().toISOString();
    const testFileName = `test_${Date.now()}.txt`;
    
    // Intentar subir el archivo
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(testFileName, testContent, {
        contentType: 'text/plain'
      });

    if (error) {
      console.error('❌ Error subiendo archivo:', error);
      return;
    }

    console.log('✅ Archivo subido exitosamente:', data);
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(testFileName);
    
    console.log('🔗 URL pública:', urlData.publicUrl);
    
    // Limpiar - eliminar el archivo de prueba
    const { error: deleteError } = await supabase.storage
      .from('documentos')
      .remove([testFileName]);
    
    if (deleteError) {
      console.warn('⚠️ No se pudo eliminar el archivo de prueba:', deleteError);
    } else {
      console.log('🗑️ Archivo de prueba eliminado');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

console.log('🚀 Iniciando prueba de subida...');
testUpload();
