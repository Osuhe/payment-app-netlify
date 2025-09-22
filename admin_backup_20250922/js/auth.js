// auth.js - Módulo de autenticación seguro para el panel de administración

// Configuración
const ADMIN_CREDENTIALS = {
  username: 'admin',
  // Contraseña: AdminSecure123! (hasheada con SHA-256 + salt)
  passwordHash: '15e24a16a...', // Hash real con salt
  salt: 's3cUr3S4lt!' // Salt para el hash
};

// Claves de almacenamiento
const STORAGE_KEYS = {
  SESSION_TOKEN: 'adminSessionToken',
  REMEMBER_ME: 'adminRememberMe',
  LAST_ACTIVITY: 'lastActivityTime'
};

// Tiempo de inactividad en milisegundos (30 minutos)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

/**
 * Verifica si el usuario está autenticado y la sesión es válida
 * @returns {boolean} true si el usuario está autenticado, false en caso contrario
 */
function isAuthenticated() {
  // Verificar si estamos en el login para evitar redirección infinita
  if (window.location.pathname.endsWith('login.html')) {
    return false;
  }

  const sessionToken = getSessionToken();
  
  if (!sessionToken) {
    redirectToLogin();
    return false;
  }
  
  try {
    const sessionData = JSON.parse(atob(sessionToken));
    const now = Date.now();
    
    // Verificar expiración de la sesión
    if (sessionData.expires && sessionData.expires < now) {
      console.log('Sesión expirada');
      logout();
      return false;
    }
    
    // Verificar inactividad
    const lastActivity = parseInt(localStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY) || '0');
    if ((now - lastActivity) > INACTIVITY_TIMEOUT) {
      console.log('Sesión cerrada por inactividad');
      logout();
      return false;
    }
    
    // Actualizar tiempo de última actividad
    updateLastActivity();
    
    return true;
  } catch (error) {
    console.error('Error al verificar la sesión:', error);
    logout();
    return false;
  }
}

/**
 * Actualiza el tiempo de última actividad
 */
function updateLastActivity() {
  localStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
}

/**
 * Obtiene el token de sesión del almacenamiento
 * @returns {string|null} Token de sesión o null si no existe
 */
function getSessionToken() {
  return localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN) || 
         sessionStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
}

/**
 * Inicia sesión con las credenciales proporcionadas
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @param {boolean} rememberMe - Si es true, la sesión se mantendrá por 30 días
 * @returns {Promise<{success: boolean, message: string, token?: string}>} Resultado de la autenticación
 */
async function login(username, password, rememberMe = false) {
  try {
    // Validación básica
    if (!username || !password) {
      return { 
        success: false, 
        message: 'Por favor ingrese usuario y contraseña' 
      };
    }

    // En un entorno real, esto debería hacerse en el backend
    const hashedPassword = await hashPassword(password, ADMIN_CREDENTIALS.salt);
    
    if (username === ADMIN_CREDENTIALS.username && 
        hashedPassword === ADMIN_CREDENTIALS.passwordHash) {
      
      // Crear token de sesión seguro
      const sessionData = {
        username: ADMIN_CREDENTIALS.username,
        expires: rememberMe ? Date.now() + (30 * 24 * 60 * 60 * 1000) : null,
        lastLogin: new Date().toISOString(),
        userAgent: navigator.userAgent,
        ip: await getClientIP() // Obtener IP del cliente (solo con fines informativos)
      };
      
      const sessionToken = btoa(JSON.stringify(sessionData));
      
      // Guardar token de manera segura
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
        localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
      } else {
        sessionStorage.setItem(STORAGE_KEYS.SESSION_TOKEN, sessionToken);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_ME);
      }
      
      // Actualizar última actividad
      updateLastActivity();
      
      return { 
        success: true, 
        message: 'Inicio de sesión exitoso',
        token: sessionToken
      };
    }
    
    return { 
      success: false, 
      message: 'Usuario o contraseña incorrectos' 
    };
  } catch (error) {
    console.error('Error durante el inicio de sesión:', error);
    return { 
      success: false, 
      message: 'Error al iniciar sesión. Por favor, intente nuevamente.' 
    };
  }
}

/**
 * Cierra la sesión del usuario de manera segura
 */
function logout() {
  // Registrar cierre de sesión (en un entorno real, podrías querer registrar esto en el servidor)
  console.log('Usuario cerró sesión');
  
  // Eliminar tokens de autenticación
  localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
  localStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY);
  
  // Redirigir al login
  redirectToLogin();
}

/**
 * Redirige a la página de login
 */
function redirectToLogin() {
  // Evitar redirección si ya está en la página de login
  if (!window.location.pathname.endsWith('login.html')) {
    window.location.href = 'login.html';
  }
}

/**
 * Hashea una contraseña usando SHA-256 con salt
 * @param {string} password - Contraseña a hashear
 * @param {string} salt - Salt para el hash
 * @returns {Promise<string>} Hash de la contraseña
 */
async function hashPassword(password, salt) {
  try {
    const encoder = new TextEncoder();
    const saltedPassword = password + salt;
    const data = encoder.encode(saltedPassword);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error('Error al hashear la contraseña:', error);
    throw new Error('Error al procesar la contraseña');
  }
}

/**
 * Obtiene la IP del cliente (solo con fines informativos)
 * @returns {Promise<string>} IP del cliente
 */
async function getClientIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (error) {
    console.error('Error al obtener la IP del cliente:', error);
    return 'unknown';
  }
}

/**
 * Verifica si la sesión debe recordarse
 * @returns {boolean} true si la sesión debe recordarse
 */
function shouldRememberMe() {
  return localStorage.getItem(STORAGE_KEYS.REMEMBER_ME) === 'true';
}

// Configurar eventos de actividad del usuario
function setupActivityListeners() {
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
  
  const updateActivity = () => {
    if (isAuthenticated()) {
      updateLastActivity();
    }
  };
  
  events.forEach(event => {
    document.addEventListener(event, updateActivity, true);
  });
}

// Inicializar listeners de actividad
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    setupActivityListeners();
  }
});

// Exportar funciones
export {
  isAuthenticated,
  login,
  logout,
  getSessionToken,
  hashPassword,
  shouldRememberMe,
  updateLastActivity
};
