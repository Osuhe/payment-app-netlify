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

async function checkTable() {
  try {
    console.log('🔍 Obteniendo información de la tabla...');
    
    // Obtener información de la estructura de la tabla
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'transactions');
    
    if (tableError) {
      console.error('Error al obtener información de la tabla:', tableError);
      return;
    }
    
    console.log('📋 Estructura de la tabla transactions:');
    console.table(tableInfo);
    
    // Obtener un ejemplo de datos
    console.log('\n🔍 Obteniendo un ejemplo de datos...');
    const { data: exampleData, error: dataError } = await supabase
      .from('transactions')
      .select('*')
      .limit(1);
    
    if (dataError) {
      console.error('Error al obtener datos de ejemplo:', dataError);
      return;
    }
    
    console.log('📄 Ejemplo de datos:');
    console.log(JSON.stringify(exampleData, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTable();
