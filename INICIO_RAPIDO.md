# 🚀 Guía Rápida de Inicio

## Pasos para Subir a GitHub

```bash
# 1. Crear repositorio en GitHub (sin README, sin .gitignore)
# Ve a https://github.com/new

# 2. Conectar tu repositorio local con GitHub
git remote add origin https://github.com/TU_USUARIO/kapso-supa.git

# 3. Verificar que el remoto está configurado
git remote -v

# 4. Subir tu código
git push -u origin main
```

## Instalación Rápida

```bash
# Instalar dependencias
npm install

# Instalar Supabase CLI (si no lo tienes)
npm install -g supabase

# Autenticarte con Supabase
supabase login
```

## Configuración Rápida de Supabase

```bash
# 1. Crear proyecto en https://supabase.com

# 2. Vincular tu proyecto local
supabase link --project-ref TU_PROJECT_REF

# 3. Aplicar migraciones
supabase db push

# 4. Desplegar Edge Function
supabase functions deploy kapso-webhook

# 5. Configurar secrets
supabase secrets set KAPSO_API_KEY=tu_api_key
supabase secrets set KAPSO_BASE_URL=https://api.kapso.ai/meta/whatsapp
```

## Configuración Rápida de Kapso

1. **Crear cuenta**: https://dashboard.kapso.ai
2. **Obtener API Key**: Dashboard → Settings → API Keys
3. **Conectar WhatsApp**: Dashboard → Sandbox (para pruebas)
4. **Configurar Webhook**: 
   - URL: `https://TU_PROJECT_REF.supabase.co/functions/v1/kapso-webhook`
   - Eventos: `messages`

## Configurar MCP de Supabase (Opcional)

**¿Qué es MCP?** Model Context Protocol te permite consultar tu base de datos usando lenguaje natural desde Cursor.

### Instalación Rápida

**Opción 1: Un Click (Recomendada)**
1. Ve a [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto
2. Click en **"AI Tools"** o **"MCP"**
3. Click en **"Add to Cursor"**
4. Autoriza en el navegador
5. ¡Listo!

**Opción 2: Manual**
```bash
# Edita ~/.cursor/mcp.json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
# Reinicia Cursor
```

**Opción 3: Modo Seguro (Solo Lectura)**
```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=TU_PROJECT_REF&readonly=true"
    }
  }
}
```

### Ejemplos de Uso

Una vez configurado, en Cursor Chat puedes escribir:

```
"Muéstrame los últimos 5 leads"
"¿Cuántos leads tengo por cada interés?"
"Explícame cómo funciona kapso-webhook/index.ts"
"Crea una query para leads de los últimos 7 días"
```

**⚠️ Importante:**
- Solo para desarrollo, NO producción
- Usa modo `readonly=true` para seguridad
- Aprueba manualmente cada tool call en Cursor

📖 **Más detalles**: Ver sección "Bonus: Configurar MCP" en el [README.md](README.md#-bonus-configurar-mcp-de-supabase-en-cursor)

## Probar el Sistema

```bash
# Opción 1: Desde WhatsApp
# - Envía "Hola" al número de Kapso
# - Sigue las instrucciones del bot

# Opción 2: Con el script de ejemplo
npm run example
# (Primero edita examples/send-initial-message.ts con tu número)
```

## Ver Logs en Tiempo Real

```bash
# Ver logs de la Edge Function
supabase functions logs kapso-webhook --tail
```

## Verificar Datos en Supabase

1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Table Editor → `leads`
4. Deberías ver los registros guardados

## Estructura de la Conversación

```
Usuario: "Hola"
Bot: "¡Bienvenido! 👋 ¿Cuál es tu nombre?"

Usuario: "Juan Pérez"
Bot: "Encantado, Juan Pérez. ¿Cuál es tu correo electrónico?"

Usuario: "juan@example.com"
Bot: "Perfecto, Juan. ¿En qué podemos ayudarte?"
     [🛍️ Productos] [💰 Precios] [📞 Llamada]

Usuario: [Selecciona un botón]
Bot: "¡Gracias! Hemos registrado tu información..."

✅ Datos guardados en Supabase
```

## Troubleshooting Rápido

**Bot no responde:**
```bash
# Verificar logs
supabase functions logs kapso-webhook

# Verificar secrets
supabase secrets list

# Re-desplegar función
supabase functions deploy kapso-webhook
```

**Error de base de datos:**
```bash
# Verificar que la migración se aplicó
supabase db diff

# Aplicar migraciones pendientes
supabase db push
```

**Error en script de ejemplo:**
```bash
# Verificar que .env existe y tiene valores correctos
cat .env

# Si no existe, créalo desde la plantilla
cp .env.example .env
# Luego edita .env con tus valores reales
```

## Comandos Útiles

```bash
# Ver estado de Supabase
supabase status

# Ver tablas en la base de datos
supabase db list

# Crear nueva migración
supabase migration new nombre_migracion

# Resetear base de datos local
supabase db reset

# Ver funciones desplegadas
supabase functions list
```

## Siguientes Pasos

1. ✅ Subir a GitHub
2. ✅ Configurar Supabase
3. ✅ Configurar Kapso
4. ✅ Probar el flujo completo
5. 🎨 Personalizar mensajes
6. 🔧 Agregar más campos al formulario
7. 🤖 Integrar con IA para respuestas inteligentes
8. 📊 Crear dashboard para visualizar leads

---

**Lee el README.md completo para más detalles** 📖

