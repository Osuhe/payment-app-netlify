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

async function truncateTable() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    // Ejecutar TRUNCATE directamente
    console.log('🗑️  Truncando la tabla de transacciones...');
    const { data, error } = await supabase.rpc('truncate_table', { 
      table_name: 'transactions' 
    });
    
    if (error) {
      console.error('Error al truncar la tabla:', error);
      console.log('⚠️  Intentando con DELETE FROM...');
      
      // Si falla, intentar con DELETE FROM
      const { data: deleteData, error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');
        
      if (deleteError) {
        throw new Error(`Error al eliminar transacciones: ${deleteError.message}`);
      }
      
      console.log('✅ Transacciones eliminadas usando DELETE');
    } else {
      console.log('✅ Tabla truncada exitosamente');
    }
    
    // Verificar que la tabla esté vacía
    console.log('🔍 Verificando que la tabla esté vacía...');
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error al verificar la tabla:', countError);
    } else {
      console.log(`📊 Total de transacciones restantes: ${count}`);
    }
    
    console.log('✨ Proceso completado');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

truncateTable();
