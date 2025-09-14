// Configuración de Supabase
const SUPABASE_URL = 'https://sejbnlnjqlyyxwuqrwen.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlamJubG5qcWx5eXh3dXFyd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxODk3NzAsImV4cCI6MjA3Mjc2NTc3MH0.q2vvElpxavLYbhZpvf_QjTPBfy3WJDxFWlROyMGWT38';

// Inicializar Supabase
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elementos del DOM
const statsContainer = document.getElementById('stats-container');
const transactionsContainer = document.getElementById('transactions-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorMessage = document.getElementById('error-message');

// Verificar autenticación
function checkAuth() {
  const token = localStorage.getItem('adminToken');
  if (!token || token !== 'admin-secure-token-2024') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Cargar estadísticas
document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuth()) return;
  
  try {
    showLoading(true);
    
    // Cargar estadísticas
    const stats = await fetchStats();
    renderStats(stats);
    
    // Cargar transacciones
    const transactions = await fetchTransactions();
    renderTransactions(transactions);
    
  } catch (error) {
    showError('Error al cargar los datos: ' + error.message);
  } finally {
    showLoading(false);
  }
});

// Obtener estadísticas
async function fetchStats() {
  const { count: totalCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true });
    
  const { count: pendingCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');
    
  const { count: completedCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed');
    
  return {
    total: totalCount || 0,
    pending: pendingCount || 0,
    completed: completedCount || 0,
    documents: 0 // Se puede implementar contando archivos en storage
  };
}

// Obtener transacciones
async function fetchTransactions(limit = 20) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  return data || [];
}

// Renderizar estadísticas
function renderStats(stats) {
  statsContainer.innerHTML = `
    <div class="stat-card">
      <div class="stat-number">${stats.total}</div>
      <div class="stat-label">Total Transacciones</div>
    </div>
    <div class="stat-card">
      <div class="stat-number text-yellow-500">${stats.pending}</div>
      <div class="stat-label">Pendientes</div>
    </div>
    <div class="stat-card">
      <div class="stat-number text-green-500">${stats.completed}</div>
      <div class="stat-label">Completadas</div>
    </div>
    <div class="stat-card">
      <div class="stat-number text-blue-500">${stats.documents}</div>
      <div class="stat-label">Documentos</div>
    </div>
  `;
}

// Renderizar transacciones
function renderTransactions(transactions) {
  if (!transactions || transactions.length === 0) {
    transactionsContainer.innerHTML = `
      <div class="empty-state">
        <h3>No hay transacciones</h3>
        <p>Aún no se han registrado transacciones.</p>
      </div>
    `;
    return;
  }
  
  transactionsContainer.innerHTML = transactions.map(transaction => `
    <div class="transaction-item">
      <div class="transaction-header">
        <div class="transaction-id">#${transaction.id}</div>
        <div class="transaction-date">${new Date(transaction.created_at).toLocaleString()}</div>
      </div>
      <div class="transaction-grid">
        <div class="transaction-field">
          <div class="field-label">Estado</div>
          <div class="field-value">
            <span class="status-badge ${getStatusClass(transaction.status)}">
              ${formatStatus(transaction.status)}
            </span>
          </div>
        </div>
        <div class="transaction-field">
          <div class="field-label">Monto</div>
          <div class="field-value">$${transaction.amount || '0.00'}</div>
        </div>
        <div class="transaction-field">
          <div class="field-label">Cliente</div>
          <div class="field-value">${transaction.customer_name || 'N/A'}</div>
        </div>
        <div class="transaction-field">
          <div class="field-label">Email</div>
          <div class="field-value">${transaction.customer_email || 'N/A'}</div>
        </div>
      </div>
      ${transaction.document_url ? `
        <div class="mt-4">
          <a href="${transaction.document_url}" target="_blank" class="document-link">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            Ver Documento
          </a>
        </div>
      ` : ''}
    </div>
  `).join('');
}

// Utilidades
function formatStatus(status) {
  const statusMap = {
    'pending': 'Pendiente',
    'completed': 'Completado',
    'failed': 'Fallido'
  };
  return statusMap[status] || status;
}

function getStatusClass(status) {
  const classMap = {
    'pending': 'bg-yellow-100 text-yellow-800',
    'completed': 'bg-green-100 text-green-800',
    'failed': 'bg-red-100 text-red-800'
  };
  return classMap[status] || 'bg-gray-100 text-gray-800';
}

function showLoading(show) {
  loadingIndicator.style.display = show ? 'block' : 'none';
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  setTimeout(() => {
    errorMessage.style.display = 'none';
  }, 5000);
}

// Cerrar sesión
window.logout = function() {
  localStorage.removeItem('adminToken');
  window.location.href = 'login.html';
};
