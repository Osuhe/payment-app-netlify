// main.js - Script principal del panel de administración

// Importar módulos
import { isAuthenticated, logout, shouldRememberMe } from './auth.js';

// Configuración de la API
const API_BASE_URL = '/.netlify/functions';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

// Caché para almacenar datos
const cache = {
  data: {},
  timestamps: {},
  
  /**
   * Obtiene datos de la caché si están disponibles y no han expirado
   * @param {string} key - Clave de la caché
   * @returns {any|null} Datos en caché o null si no están disponibles
   */
  get(key) {
    const item = this.data[key];
    const timestamp = this.timestamps[key];
    
    if (item && timestamp && (Date.now() - timestamp) < CACHE_TTL) {
      return item;
    }
    
    // Eliminar datos expirados
    if (item) {
      delete this.data[key];
      delete this.timestamps[key];
    }
    
    return null;
  },
  
  /**
   * Almacena datos en la caché
   * @param {string} key - Clave para almacenar los datos
   * @param {any} data - Datos a almacenar
   */
  set(key, data) {
    this.data[key] = data;
    this.timestamps[key] = Date.now();
  },
  
  /**
   * Limpia la caché
   * @param {string} [key] - Clave opcional para limpiar un elemento específico
   */
  clear(key) {
    if (key) {
      delete this.data[key];
      delete this.timestamps[key];
    } else {
      this.data = {};
      this.timestamps = {};
    }
  }
};

/**
 * Muestra u oculta el indicador de carga global
 * @param {boolean} show - Si es true, muestra el indicador
 * @param {string} [message] - Mensaje opcional a mostrar
 */
export function showLoading(show, message = 'Cargando...') {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) {
    const messageElement = loadingIndicator.querySelector('span:not(.animate-spin)');
    if (messageElement) {
      messageElement.textContent = message;
    }
    loadingIndicator.classList.toggle('hidden', !show);
  }
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 * @param {string} [type='error'] - Tipo de mensaje (error, warning, success, info)
 * @param {number} [timeout=5000] - Tiempo en ms antes de que el mensaje desaparezca (0 para permanente)
 */
export function showMessage(message, type = 'error', timeout = 5000) {
  // Crear contenedor de mensajes si no existe
  let messagesContainer = document.getElementById('messages-container');
  if (!messagesContainer) {
    messagesContainer = document.createElement('div');
    messagesContainer.id = 'messages-container';
    messagesContainer.className = 'fixed top-4 right-4 z-50 space-y-2 w-80';
    document.body.appendChild(messagesContainer);
  }
  
  // Crear el mensaje
  const messageElement = document.createElement('div');
  const typeClasses = {
    error: 'bg-red-100 border-red-400 text-red-700',
    success: 'bg-green-100 border-green-400 text-green-700',
    warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700'
  };
  
  messageElement.className = `border-l-4 p-4 rounded shadow-lg ${typeClasses[type] || typeClasses.error} relative`;
  messageElement.role = 'alert';
  
  messageElement.innerHTML = `
    <div class="flex">
      <div class="flex-shrink-0">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 
                        type === 'warning' ? 'fa-exclamation-triangle' : 
                        type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'} 
             text-lg"></i>
      </div>
      <div class="ml-3">
        <p class="text-sm">${message}</p>
      </div>
      <div class="ml-4 flex-shrink-0 flex">
        <button class="inline-flex text-gray-500 focus:outline-none focus:text-gray-700">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;
  
  // Agregar el mensaje al contenedor
  messagesContainer.appendChild(messageElement);
  
  // Configurar el botón de cierre
  const closeButton = messageElement.querySelector('button');
  closeButton.addEventListener('click', () => {
    messageElement.classList.add('opacity-0', 'transition-opacity', 'duration-300');
    setTimeout(() => messageElement.remove(), 300);
  });
  
  // Configurar tiempo de espera para ocultar el mensaje
  if (timeout > 0) {
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => messageElement.remove(), 300);
      }
    }, timeout);
  }
  
  // Animar la aparición
  messageElement.style.opacity = '0';
  messageElement.style.transform = 'translateX(100%)';
  messageElement.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
  
  setTimeout(() => {
    messageElement.style.opacity = '1';
    messageElement.style.transform = 'translateX(0)';
  }, 10);
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error
 * @param {number} [timeout=5000] - Tiempo en ms antes de que el mensaje desaparezca
 */
export function showError(message, timeout = 5000) {
  showMessage(message, 'error', timeout);
}

/**
 * Realiza una petición a la API
 * @param {string} endpoint - Endpoint de la API
 * @param {Object} [options] - Opciones de la petición
 * @returns {Promise<any>} Respuesta de la API
 */
export async function apiRequest(endpoint, options = {}) {
  const { useCache = true, method = 'GET', body, headers = {} } = options;
  const cacheKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
  
  // Verificar caché para peticiones GET
  if (useCache && method === 'GET') {
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Usando datos en caché para: ${endpoint}`);
      return cachedData;
    }
  }
  
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const requestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      credentials: 'same-origin'
    };
    
    if (body) {
      requestOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, requestOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Error en la petición: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Almacenar en caché si es una petición GET exitosa
    if (useCache && method === 'GET') {
      cache.set(cacheKey, data);
    }
    
    return data;
  } catch (error) {
    console.error('Error en la petición a la API:', error);
    throw error;
  }
}

/**
 * Formatea una fecha a un formato legible
 * @param {string|Date} date - Fecha a formatear
 * @param {string} [locale='es-ES'] - Configuración regional
 * @returns {string} Fecha formateada
 */
export function formatDate(date, locale = 'es-ES') {
  if (!date) return 'N/A';
  
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Fecha inválida';
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Formatea un número como moneda
 * @param {number} amount - Cantidad a formatear
 * @param {string} [currency='USD'] - Código de moneda
 * @param {string} [locale='es-ES'] - Configuración regional
 * @returns {string} Cantidad formateada como moneda
 */
export function formatCurrency(amount, currency = 'USD', locale = 'es-ES') {
  if (isNaN(amount)) return 'N/A';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Elementos del DOM
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.querySelector('.sidebar');
const logoutButton = document.querySelector('[onclick="logout()"]');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  // Verificar autenticación
  if (!isAuthenticated()) {
    window.location.href = '../login.html';
    return;
  }
  
  // Inicializar componentes
  initSidebar();
  initLogout();
  updateUI();
  
  // Cargar datos iniciales
  loadInitialData();
});

/**
 * Inicializa el menú lateral
 */
function initSidebar() {
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', () => {
      sidebar.classList.toggle('active');
      document.body.classList.toggle('overflow-hidden');
    });
  }
  
  // Cerrar menú al hacer clic fuera de él en móviles
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 1024 && 
        sidebar && 
        !sidebar.contains(e.target) && 
        menuToggle && 
        !menuToggle.contains(e.target)) {
      sidebar.classList.remove('active');
      document.body.classList.remove('overflow-hidden');
    }
  });
}

/**
 * Inicializa el botón de cierre de sesión
 */
function initLogout() {
  if (logoutButton) {
    // Reemplazar el atributo onclick con un event listener
    logoutButton.removeAttribute('onclick');
    logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}

/**
 * Actualiza la interfaz de usuario según el estado de la aplicación
 */
function updateUI() {
  // Actualizar el nombre de usuario en la barra superior
  const userElement = document.querySelector('.user-name');
  if (userElement) {
    try {
      const sessionToken = localStorage.getItem('adminSessionToken') || 
                         sessionStorage.getItem('adminSessionToken');
      if (sessionToken) {
        const sessionData = JSON.parse(atob(sessionToken));
        userElement.textContent = sessionData.username || 'Administrador';
      }
    } catch (error) {
      console.error('Error al actualizar la UI:', error);
    }
  }
  
  // Actualizar el estado de "Recordarme"
  const rememberMe = shouldRememberMe();
  const rememberMeCheckbox = document.getElementById('remember-me');
  if (rememberMeCheckbox) {
    rememberMeCheckbox.checked = rememberMe;
  }
}

/**
 * Carga los datos iniciales del panel
 */
async function loadInitialData() {
  try {
    // Mostrar indicador de carga
    showLoading(true);
    
    // Aquí iría la carga de datos del dashboard
    // Por ejemplo: estadísticas, últimas transacciones, etc.
    
    // Simular carga de datos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
    showError('Error al cargar los datos. Por favor, recargue la página.');
  } finally {
    showLoading(false);
  }
}

/**
 * Muestra u oculta el indicador de carga
 * @param {boolean} show - Si es true, muestra el indicador de carga
 */
function showLoading(show) {
  const loadingElement = document.getElementById('loading-indicator');
  if (loadingElement) {
    loadingElement.style.display = show ? 'block' : 'none';
  }
}

/**
 * Muestra un mensaje de error
 * @param {string} message - Mensaje de error a mostrar
 */
function showError(message) {
  // Implementar lógica para mostrar mensajes de error
  console.error(message);
  alert(message); // Reemplazar con un sistema de notificaciones
}

// Hacer las funciones disponibles globalmente si es necesario
window.adminApp = {
  logout,
  showLoading,
  showError
};

// Inicializar tooltips (si se usan)
function initTooltips() {
  const tooltipTriggers = document.querySelectorAll('[data-tooltip]');
  tooltipTriggers.forEach(trigger => {
    // Implementar tooltips si es necesario
  });
}

// Inicializar tooltips al cargar el DOM
document.addEventListener('DOMContentLoaded', initTooltips);
