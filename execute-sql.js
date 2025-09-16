const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // Leer el archivo SQL
    const fs = require('fs');
    const sql = fs.readFileSync('./create-truncate-function.sql', 'utf8');
    
    console.log('🚀 Ejecutando script SQL...');
    
    // Ejecutar el script SQL
    const { data, error } = await supabase.rpc('sql', { 
      query: sql 
    });
    
    if (error) {
      console.error('❌ Error al ejecutar el script SQL:', error);
      return;
    }
    
    console.log('✅ Función safe_truncate_table creada exitosamente');
    
    // Probar la función
    console.log('🔍 Probando la función...');
    const { data: result, error: truncateError } = await supabase
      .rpc('safe_truncate_table', { 
        table_name: 'transactions' 
      });
    
    if (truncateError) {
      console.error('❌ Error al ejecutar safe_truncate_table:', truncateError);
      return;
    }
    
    console.log('✅ Tabla truncada exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

executeSql();
