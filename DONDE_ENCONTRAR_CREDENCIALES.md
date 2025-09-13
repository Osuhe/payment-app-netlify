# 📍 DÓNDE ENCONTRAR LAS CREDENCIALES DE SUPABASE

## Paso a paso:

### 1. Ve al Dashboard de Supabase
🌐 **URL:** https://supabase.com/dashboard

### 2. Inicia sesión
- Usa tu cuenta de GitHub, Google o email

### 3. Selecciona tu proyecto
- Verás una lista de tus proyectos
- Haz clic en el proyecto que estás usando para esta app

### 4. Ve a Settings (Configuración)
- En el menú lateral izquierdo, busca "Settings" 
- Haz clic en "Settings"

### 5. Selecciona "API"
- Dentro de Settings, busca la sección "API"
- Haz clic en "API"

### 6. Copia las credenciales
Verás dos valores importantes:

**🔗 Project URL:**
```
https://[tu-proyecto-id].supabase.co
```

**🔑 anon public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ilt0dS1wcm95ZWN0by1pZF0iLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjM2ODU2OCwiZXhwIjoxOTUxOTQ0NTY4fQ.ejemplo
```

## ⚠️ IMPORTANTE:
- **NO compartas** estas credenciales públicamente
- La "anon public key" es segura para usar en el frontend
- **NO uses** la "service_role key" (esa es privada)

## 🚀 Una vez que las tengas:

### Opción 1: Archivo .env (para pruebas locales)
Crea `.env` en la raíz del proyecto:
```
SUPABASE_URL=https://tu-proyecto-id.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Opción 2: Netlify (para producción)
1. Ve a tu sitio en Netlify Dashboard
2. Site settings > Environment variables
3. Agrega las dos variables
4. Redeploy el sitio

¡Una vez configuradas, los documentos se subirán automáticamente!
