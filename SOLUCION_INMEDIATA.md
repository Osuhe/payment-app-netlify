# 🚨 SOLUCIÓN INMEDIATA PARA SUBIR DOCUMENTOS

## El problema
Los documentos no se suben porque las credenciales de Supabase no están configuradas correctamente.

## Solución en 3 pasos:

### 1. Obtener credenciales reales
Ve a tu panel de Supabase:
- https://supabase.com/dashboard
- Selecciona tu proyecto
- Settings > API
- Copia: **Project URL** y **anon public key**

### 2. Configurar en Netlify
En tu sitio de Netlify:
- Site settings > Environment variables
- Agrega:
  ```
  SUPABASE_URL = tu_project_url_real
  SUPABASE_ANON_KEY = tu_anon_key_real
  ```

### 3. Redeploy
- Haz un nuevo deploy del sitio
- Las funciones ahora tendrán acceso a las credenciales correctas

## Alternativa rápida
Si quieres probar AHORA mismo:

1. Crea archivo `.env` en la raíz del proyecto:
```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

2. Ejecuta:
```bash
node test-direct-upload.js
```

## ¿Por qué está vacío el bucket?
- Las credenciales que tengo son de ejemplo/inválidas
- Supabase rechaza las peticiones (error 403)
- Necesitas las credenciales REALES de TU proyecto

Una vez configuradas las credenciales correctas, los documentos se subirán automáticamente.
