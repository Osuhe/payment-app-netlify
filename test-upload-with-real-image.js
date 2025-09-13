// Script para probar subida de imagen real usando las credenciales correctas
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Credenciales reales
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadImageTest() {
  try {
    console.log('📸 Probando subida de imagen simulada...');
    
    // Crear una imagen base64 de prueba (pixel transparente 1x1)
    const testImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    
    // Convertir a buffer como lo hace la función real
    const base64Data = testImageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const transactionId = 'TEST-' + Date.now();
    const fileName = `documento_${transactionId}_${Date.now()}.png`;
    
    console.log('📤 Subiendo imagen:', {
      fileName,
      size: buffer.length,
      transactionId
    });
    
    // Subir imagen
    const { data, error } = await supabase.storage
      .from('documentos')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error('❌ Error subiendo imagen:', error);
      return;
    }

    console.log('✅ Imagen subida exitosamente:', data);
    
    // Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(fileName);
    
    console.log('🔗 URL pública de la imagen:', urlData.publicUrl);
    
    // Listar todos los archivos en el bucket
    const { data: files, error: listError } = await supabase.storage
      .from('documentos')
      .list();
    
    if (listError) {
      console.error('❌ Error listando archivos:', listError);
    } else {
      console.log('📋 Archivos en bucket documentos:');
      files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.metadata?.size || 'N/A'} bytes)`);
      });
    }
    
    console.log('\n🎉 ¡PRUEBA EXITOSA! Los documentos ahora se suben correctamente.');
    console.log('💡 Ahora puedes usar tu aplicación web para subir documentos reales.');
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

uploadImageTest();
