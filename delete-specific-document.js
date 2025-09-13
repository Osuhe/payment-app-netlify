// Script directo para eliminar el documento específico de Supabase Storage
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno de Supabase');
  console.log('Asegúrate de tener SUPABASE_URL y SUPABASE_ANON_KEY en tu archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteSpecificDocument() {
  try {
    console.log('🔍 Listando archivos en el bucket "documentos"...');
    
    // Primero listar todos los archivos para ver qué hay
    const { data: files, error: listError } = await supabase.storage
      .from('documentos')
      .list('', { limit: 100 });

    if (listError) {
      console.error('❌ Error listando archivos:', listError);
      return;
    }

    console.log('📁 Archivos encontrados:');
    files.forEach((file, index) => {
      console.log(`${index + 1}. ${file.name} (${file.metadata?.size || 'N/A'} bytes)`);
    });

    // El archivo específico que vimos en la imagen
    const targetFileName = 'documentos_TEST-1672889489407-1672889787763.png';
    
    // Verificar si el archivo existe
    const fileExists = files.some(file => file.name === targetFileName);
    
    if (!fileExists) {
      console.log(`⚠️  El archivo "${targetFileName}" no se encontró en el bucket.`);
      console.log('Archivos disponibles para eliminar:');
      files.forEach((file, index) => {
        console.log(`${index + 1}. ${file.name}`);
      });
      return;
    }

    console.log(`🗑️  Eliminando archivo: ${targetFileName}`);
    
    // Eliminar el archivo específico
    const { data, error } = await supabase.storage
      .from('documentos')
      .remove([targetFileName]);

    if (error) {
      console.error('❌ Error eliminando archivo:', error);
      return;
    }

    console.log('✅ Archivo eliminado exitosamente');
    
    // Verificar que se eliminó
    const { data: filesAfter, error: listAfterError } = await supabase.storage
      .from('documentos')
      .list('', { limit: 100 });

    if (!listAfterError) {
      console.log(`📊 Archivos restantes: ${filesAfter.length}`);
      if (filesAfter.length > 0) {
        filesAfter.forEach((file, index) => {
          console.log(`${index + 1}. ${file.name}`);
        });
      } else {
        console.log('🎉 El bucket está ahora completamente limpio');
      }
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar la función
console.log('🚀 Iniciando eliminación de documento específico...');
deleteSpecificDocument();
