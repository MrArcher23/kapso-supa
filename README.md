# 🚀 Ejercicio: Integración Kapso WhatsApp + Supabase

Este proyecto es un ejercicio práctico que demuestra cómo integrar **Kapso** (API de WhatsApp Cloud) con **Supabase** para crear un bot de cualificación de leads mediante conversaciones interactivas con botones.

## 📋 Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Flujo de Conversación](#flujo-de-conversación)
- [Requisitos Previos](#requisitos-previos)
- [Paso 1: Configurar Supabase](#paso-1-configurar-supabase)
- [Paso 2: Configurar Kapso](#paso-2-configurar-kapso)
- [Paso 3: Desplegar la Aplicación](#paso-3-desplegar-la-aplicación)
- [Paso 4: Pruebas](#paso-4-pruebas)
- [Bonus: Configurar MCP](#bonus-configurar-mcp-de-supabase-en-cursor)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Troubleshooting](#troubleshooting)
- [Problemas Comunes y Soluciones](#problemas-comunes-y-soluciones)

## 🏗️ Arquitectura

```
┌─────────────┐         ┌─────────────┐         ┌──────────────────┐
│  WhatsApp   │────────>│    Kapso    │────────>│ Supabase Edge    │
│   Usuario   │         │     API     │         │    Function      │
└─────────────┘         └─────────────┘         └──────────────────┘
                                                          │
                                                          ├─> Gestiona Estado
                                                          ├─> Valida Datos
                                                          ├─> Responde vía Kapso
                                                          └─> Guarda en DB

                                                  ┌──────────────────┐
                                                  │   PostgreSQL     │
                                                  │  (Tabla Leads)   │
                                                  └──────────────────┘
```

### Componentes:

1. **WhatsApp**: Canal de comunicación con el usuario
2. **Kapso API**: Servicio que conecta WhatsApp con tu aplicación
3. **Supabase Edge Function**: Webhook que procesa mensajes y gestiona la conversación
4. **PostgreSQL (Supabase)**: Base de datos donde se almacenan los leads cualificados

## 💬 Flujo de Conversación

El bot guía al usuario a través de una serie de preguntas para cualificar el lead:

1. **Usuario**: "Hola"
2. **Bot**: "¡Bienvenido! 👋 Para ayudarte mejor, ¿cuál es tu nombre?"
3. **Usuario**: "Juan Pérez"
4. **Bot**: "Encantado, Juan Pérez. ¿Cuál es tu correo electrónico?"
5. **Usuario**: "juan@example.com"
6. **Bot**: "Perfecto, Juan. ¿En qué podemos ayudarte?" (con botones interactivos)
   - 🛍️ Información sobre productos
   - 💰 Consulta de precios
   - 📞 Agendar una llamada
   - 🆘 Soporte técnico
7. **Usuario**: Selecciona una opción
8. **Bot**: "¡Gracias! Hemos registrado tu información. Un miembro de nuestro equipo se pondrá en contacto contigo pronto."
9. **Sistema**: Guarda en Supabase: nombre, teléfono, email, interés

## ✅ Requisitos Previos

Antes de comenzar, asegúrate de tener:

- **Node.js** 18+ y **npm** instalados
- **Cuenta de Supabase** (gratuita): [supabase.com](https://supabase.com)
- **Cuenta de Kapso** (gratuita): [kapso.ai](https://kapso.ai)
- **Supabase CLI** instalado:
  ```bash
  npm install -g supabase
  ```
- **Git** inicializado en el proyecto (ya lo hiciste)

## 📦 Paso 1: Configurar Supabase

### 1.1 Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Haz clic en **"New Project"**
3. Completa los datos:
   - **Name**: `kapso-leads` (o el nombre que prefieras)
   - **Database Password**: Crea una contraseña segura (guárdala)
   - **Region**: Selecciona la más cercana a ti
4. Espera 2-3 minutos mientras se crea el proyecto

### 1.2 Instalar Supabase CLI y Autenticarte

```bash
# Instalar Supabase CLI según tu sistema operativo:

# macOS (usando Homebrew)
brew install supabase/tap/supabase

# Linux (usando Homebrew en Linux)
brew install supabase/tap/supabase

# Windows (usando Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# O descarga el binario directamente desde:
# https://github.com/supabase/cli/releases

# Verificar instalación
supabase --version

# Autenticarte con Supabase
supabase login
```

**⚠️ Importante**: Ya no se puede instalar Supabase CLI con `npm install -g supabase`. Usa uno de los métodos anteriores.

### 1.3 Vincular tu Proyecto Local con Supabase

```bash
# Desde el directorio del proyecto
cd /home/mrarcher/Projects/kapso-supa

# Vincular con tu proyecto de Supabase
supabase link --project-ref TU_PROJECT_REF
```

**¿Dónde encuentro mi `project-ref`?**

- En Supabase Dashboard → Settings → General → Reference ID

### 1.4 Crear la Tabla de Leads

Ejecuta la migración para crear la tabla:

```bash
# Aplicar la migración a tu base de datos
supabase db push
```

Esto creará la tabla `leads` con la siguiente estructura:

| Campo                | Tipo      | Descripción                     |
| -------------------- | --------- | ------------------------------- |
| `id`                 | UUID      | Identificador único (PK)        |
| `phone_number`       | TEXT      | Número de teléfono del lead     |
| `name`               | TEXT      | Nombre del lead                 |
| `email`              | TEXT      | Email del lead                  |
| `interest`           | TEXT      | Interés seleccionado (nullable) |
| `conversation_state` | JSONB     | Estado de la conversación       |
| `created_at`         | TIMESTAMP | Fecha de creación               |
| `updated_at`         | TIMESTAMP | Fecha de última actualización   |

### 1.5 Desplegar la Edge Function

```bash
# Desplegar la función al servidor de Supabase
supabase functions deploy kapso-webhook
```

### 1.6 Configurar Secrets (Variables de Entorno)

La Edge Function necesita tu API Key de Kapso. Configúrala como secret:

```bash
# Reemplaza YOUR_KAPSO_API_KEY con tu API key real
supabase secrets set KAPSO_API_KEY=YOUR_KAPSO_API_KEY
supabase secrets set KAPSO_BASE_URL=https://api.kapso.ai/meta/whatsapp
```

**Nota**: Obtendrás tu API Key de Kapso en el Paso 2.

### 1.7 Obtener la URL de tu Edge Function

```bash
# Ver las funciones desplegadas
supabase functions list
```

Tu URL será algo como:

```
https://PROJECT_REF.supabase.co/functions/v1/kapso-webhook
```

**Guarda esta URL**, la necesitarás para configurar el webhook en Kapso.

## 🔑 Paso 2: Configurar Kapso

### 2.1 Crear Cuenta en Kapso

1. Ve a [dashboard.kapso.ai](https://dashboard.kapso.ai)
2. Regístrate o inicia sesión
3. Completa el proceso de verificación

### 2.2 Obtener tu API Key

1. En el Dashboard de Kapso, ve a **Settings** → **API Keys**
2. Haz clic en **"Generate New API Key"**
3. Copia la API Key (guárdala en un lugar seguro)
4. **Vuelve al Paso 1.6** y configura el secret en Supabase con esta API Key

### 2.3 Conectar WhatsApp

Tienes dos opciones:

#### Opción A: Usar Kapso Sandbox (Para Pruebas - Recomendado)

1. En el Dashboard de Kapso, ve a **Sandbox**
2. Sigue las instrucciones para conectar tu número de WhatsApp personal
3. Recibirás un código de verificación en WhatsApp
4. Una vez verificado, obtendrás un `phoneNumberId` para pruebas

#### Opción B: Conectar tu Propio Número de WhatsApp Business

1. Ve a **Phone Numbers** → **Add Phone Number**
2. Sigue el proceso de verificación con Meta Business
3. Conecta tu número de WhatsApp Business
4. Obtén tu `phoneNumberId`

**Guarda tu `phoneNumberId`**, lo necesitarás para las pruebas.

### 2.4 Configurar el Webhook

1. En el Dashboard de Kapso, ve a **Webhooks** o **Settings** → **Webhooks**
2. Haz clic en **"Add Webhook"** o **"Configure Webhook"**
3. Ingresa la URL de tu Edge Function de Supabase:
   ```
   https://PROJECT_REF.supabase.co/functions/v1/kapso-webhook
   ```
4. Selecciona los eventos a los que te quieres suscribir:
   - ✅ `messages` (mensajes entrantes)
   - ✅ `message_status` (opcional, para tracking)
5. Guarda la configuración

### 2.5 Verificar el Webhook

Kapso enviará una petición de verificación a tu webhook. La Edge Function ya está configurada para manejarlo automáticamente.

Si todo está correcto, verás un estado **"Verified" ✅** en el Dashboard de Kapso.

## 🚀 Paso 3: Desplegar la Aplicación

### 3.1 Instalar Dependencias (Para Scripts de Ejemplo)

```bash
# Instalar dependencias del proyecto
npm install
```

### 3.2 Configurar Variables de Entorno Locales

Crea un archivo `.env` (basado en `.env.example`):

```bash
cp .env.example .env
```

Edita el archivo `.env` y completa los valores:

```env
# Supabase
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Kapso
KAPSO_API_KEY=your_kapso_api_key
KAPSO_PHONE_NUMBER_ID=your_phone_number_id
KAPSO_BASE_URL=https://api.kapso.ai/meta/whatsapp
```

**¿Dónde encuentro estos valores?**

- **SUPABASE_URL** y **SUPABASE_ANON_KEY**:
  - Supabase Dashboard → Settings → API
- **KAPSO_API_KEY**:
  - Del Paso 2.2
- **KAPSO_PHONE_NUMBER_ID**:
  - Del Paso 2.3

### 3.3 Verificar el Despliegue

```bash
# Ver logs de la Edge Function en tiempo real
supabase functions logs kapso-webhook --tail
```

Deja esta terminal abierta para monitorear los logs mientras pruebas.

## 🧪 Paso 4: Pruebas

### 4.1 Probar con WhatsApp

1. **Envía un mensaje** desde WhatsApp al número conectado en Kapso:

   ```
   Hola
   ```

2. **El bot debería responder**:

   ```
   ¡Bienvenido! 👋 Para ayudarte mejor, ¿cuál es tu nombre?
   ```

3. **Responde con tu nombre**:

   ```
   Juan Pérez
   ```

4. **El bot preguntará por tu email**:

   ```
   Encantado, Juan Pérez. ¿Cuál es tu correo electrónico?
   ```

5. **Proporciona tu email**:

   ```
   juan@example.com
   ```

6. **El bot mostrará botones interactivos**:

   ```
   Perfecto, Juan. ¿En qué podemos ayudarte?

   🛍️ Información sobre productos
   💰 Consulta de precios
   📞 Agendar una llamada
   🆘 Soporte técnico
   ```

7. **Selecciona una opción** usando los botones

8. **El bot confirmará**:
   ```
   ¡Gracias! Hemos registrado tu información. Un miembro de nuestro equipo se pondrá en contacto contigo pronto.
   ```

### 4.2 Verificar los Datos en Supabase

1. Ve a Supabase Dashboard → **Table Editor**
2. Selecciona la tabla **`leads`**
3. Deberías ver tu registro con:
   - `phone_number`: Tu número de WhatsApp
   - `name`: Juan Pérez
   - `email`: juan@example.com
   - `interest`: La opción que seleccionaste

### 4.3 Ejecutar el Script de Ejemplo (Opcional)

También puedes probar enviando un mensaje programáticamente:

```bash
# Compilar y ejecutar el script de ejemplo
npx tsx examples/send-initial-message.ts
```

Este script enviará un mensaje de bienvenida proactivo a un número de prueba.

### 4.4 Monitorear Logs

En la terminal donde ejecutaste `supabase functions logs`, verás:

```
[kapso-webhook] Mensaje recibido de: +1234567890
[kapso-webhook] Estado actual: WAITING_FOR_NAME
[kapso-webhook] Lead guardado exitosamente
```

## 🎁 Bonus: Configurar MCP de Supabase en Cursor

### ¿Qué es MCP?

El **Model Context Protocol (MCP)** es un estándar que permite conectar herramientas de IA (como Cursor) con plataformas como Supabase. Una vez conectado, puedes interactuar con tu base de datos y proyecto usando **lenguaje natural** directamente desde tu IDE.

Según la [documentación oficial de Supabase](https://supabase.com/docs/guides/getting-started/mcp), MCP permite que tu asistente de IA consulte y gestione tu proyecto de Supabase de forma inteligente.

### Beneficios para Este Proyecto

Con MCP configurado en Cursor, podrás:

✅ **Consultar la tabla `leads`** con preguntas naturales

- "Muéstrame los últimos 5 leads capturados"
- "¿Cuántos leads tengo por cada tipo de interés?"
- "¿Qué leads tienen email de Gmail?"

✅ **Depurar la Edge Function** `kapso-webhook`

- "Explícame cómo funciona la máquina de estados"
- "¿Por qué no se está guardando el email?"

✅ **Escribir migraciones SQL** con ayuda de IA

- "Crea una migración para agregar campo 'empresa' a la tabla leads"
- "Ayúdame a optimizar el índice de phone_number"

✅ **Explorar estados de conversación**

- "Muéstrame leads que están en WAITING_FOR_EMAIL"
- "¿Cuál es la estructura del campo conversation_state?"

### Instalación

Tienes 3 opciones para configurar MCP:

#### Opción 1: Instalación con Un Click (Recomendada)

Esta es la forma más rápida y sencilla:

1. Ve a tu [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecciona tu proyecto `kapso-leads`
3. Ve a la sección **AI Tools** o **MCP**
4. Haz clic en **"Add to Cursor"**
5. Se abrirá tu navegador para autenticarte
6. Autoriza el acceso a tu organización de Supabase
7. ¡Listo! Cursor ahora puede acceder a tu proyecto

**Nota**: La autenticación se hace vía OAuth, no necesitas generar tokens manualmente.

#### Opción 2: Configuración Manual

Si prefieres configurar manualmente:

1. Abre tu editor Cursor
2. Ve a **Settings** → **Model Context Protocol**
3. O edita directamente el archivo `.cursor/mcp.json` en tu directorio home
4. Agrega esta configuración:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

5. Reinicia Cursor
6. La primera vez que uses MCP, se abrirá un navegador para autenticarte

#### Opción 3: Scoped al Proyecto (Más Segura)

Para mayor seguridad, puedes limitar el acceso solo a tu proyecto específico en modo lectura:

```json
{
  "mcpServers": {
    "supabase": {
      "url": "https://mcp.supabase.com/mcp?project_ref=TU_PROJECT_REF&readonly=true"
    }
  }
}
```

**¿Dónde encuentro `project_ref`?**

- En Supabase Dashboard → Settings → General → Reference ID

**Ventajas del modo `readonly=true`:**

- Solo consultas SELECT
- No puede modificar o eliminar datos
- Perfecto para exploración segura

### Uso con Ejemplos

Una vez configurado, puedes hacer preguntas directamente en Cursor:

**Consultas de Datos:**

```
// En Cursor Chat, escribe:
"Muéstrame todos los leads de la última hora"
"¿Cuántos leads tengo en total?"
"Agrupa los leads por interés y muéstrame el conteo"
```

**Exploración de Código:**

```
"Explícame paso a paso cómo funciona kapso-webhook/index.ts"
"¿Qué hace la función processMessage?"
"Muéstrame un ejemplo de cómo se guarda un lead"
```

**Debugging:**

```
"¿Por qué un lead podría quedarse en WAITING_FOR_EMAIL?"
"Muéstrame los logs de error de la Edge Function"
"¿Qué pasa si un usuario envía un email inválido?"
```

**Desarrollo:**

```
"Crea una query para obtener leads de los últimos 7 días"
"Ayúdame a agregar un campo 'telefono' a la tabla leads"
"Sugiere índices para mejorar el rendimiento de la tabla"
```

### Consideraciones de Seguridad

⚠️ **IMPORTANTE**: Lee las [mejores prácticas de seguridad de Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp#security-risks) antes de usar.

**Recomendaciones clave:**

1. **🚫 No conectes a producción**

   - Usa MCP solo en tu proyecto de desarrollo
   - Si tienes datos reales, usa una copia o datos de prueba

2. **👥 No lo des a clientes**

   - MCP opera con tus permisos de desarrollador
   - Solo para uso interno del equipo

3. **📖 Modo Read-Only**

   - Si trabajas con datos sensibles, usa `readonly=true`
   - Previene modificaciones accidentales

4. **🎯 Scope al Proyecto**

   - Limita el acceso a un solo proyecto
   - Evita que el LLM acceda a otros proyectos

5. **✋ Aprobación Manual**

   - Mantén activada la aprobación manual de tool calls en Cursor
   - Revisa cada acción antes de ejecutarla

6. **🌿 Usa Branching**
   - Considera usar [Supabase Branching](https://supabase.com/docs/guides/platform/branching) para desarrollo
   - Prueba cambios en una rama antes de aplicarlos

### Verificar que Funciona

Después de configurar MCP:

1. Abre Cursor Chat (Cmd/Ctrl + L)
2. Escribe: "Muéstrame la estructura de la tabla leads"
3. Cursor debería consultar Supabase y mostrarte los campos
4. Si pide autorización, acepta el tool call

Si funciona correctamente, verás algo como:

```
La tabla 'leads' tiene los siguientes campos:
- id (uuid)
- phone_number (text)
- name (text)
- email (text)
- interest (text)
- conversation_state (jsonb)
- created_at (timestamp)
- updated_at (timestamp)
```

### Troubleshooting MCP

**MCP no se conecta:**

```bash
# Verifica que Cursor tenga la configuración correcta
cat ~/.cursor/mcp.json

# Reinicia Cursor completamente
# Intenta autenticarte de nuevo
```

**Error de autenticación:**

- Revoca el acceso en [Supabase Dashboard](https://supabase.com/dashboard) → Settings → OAuth Apps
- Vuelve a autorizar desde Cursor

**No puede acceder a mi proyecto:**

- Verifica que el `project_ref` sea correcto
- Asegúrate de haber autorizado la organización correcta
- Revisa que tu cuenta tenga permisos en el proyecto

**Queries muy lentas:**

- MCP hace queries reales a tu base de datos
- Si tienes muchos datos, las queries pueden tardar
- Considera agregar límites: "últimos 10 registros"

Para más ayuda, consulta la [documentación oficial de Supabase MCP](https://supabase.com/docs/guides/getting-started/mcp).

---

## 📁 Estructura del Proyecto

```
kapso-supa/
├── README.md                          # Esta guía
├── .env.example                       # Variables de entorno (plantilla)
├── .env                              # Variables de entorno (no commiteadas)
├── .gitignore                        # Archivos ignorados por git
├── package.json                      # Dependencias del proyecto
├── supabase/
│   ├── migrations/
│   │   └── 001_create_leads_table.sql   # Script de creación de tabla
│   └── functions/
│       └── kapso-webhook/
│           ├── index.ts              # Lógica principal del webhook
│           └── deno.json             # Configuración de Deno
└── examples/
    └── send-initial-message.ts       # Script de ejemplo
```

## 🔍 Detalles Técnicos

### Estructura de la Conversación

La Edge Function usa una máquina de estados simple:

```typescript
Estados:
- INITIAL          → Primera interacción
- WAITING_FOR_NAME → Esperando el nombre
- WAITING_FOR_EMAIL → Esperando el email
- WAITING_FOR_INTEREST → Esperando selección de interés
- COMPLETED        → Conversación finalizada
```

### Formato de Mensajes de Kapso (Webhook)

Los mensajes que Kapso envía al webhook tienen este formato:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "1234567890",
                "id": "wamid.xxx",
                "timestamp": "1234567890",
                "type": "text",
                "text": {
                  "body": "Hola"
                }
              }
            ],
            "metadata": {
              "phone_number_id": "647015955153740"
            }
          }
        }
      ]
    }
  ]
}
```

### Validación de Email

La función valida emails usando una expresión regular:

```typescript
/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

Si el email es inválido, el bot pedirá que lo proporcione nuevamente.

### Botones Interactivos

Los botones se envían usando el formato de WhatsApp Interactive Messages:

```typescript
{
  type: "interactive",
  interactive: {
    type: "button",
    body: { text: "¿En qué podemos ayudarte?" },
    action: {
      buttons: [
        { type: "reply", reply: { id: "btn_1", title: "Productos" }},
        { type: "reply", reply: { id: "btn_2", title: "Precios" }}
      ]
    }
  }
}
```

## ❗ Troubleshooting

### El bot no responde a mis mensajes

**Posibles causas:**

1. **Webhook no configurado correctamente**

   - Verifica que la URL en Kapso apunte a tu Edge Function
   - Revisa que el webhook esté "Verified" en el Dashboard de Kapso

2. **Edge Function con errores**

   - Revisa los logs: `supabase functions logs kapso-webhook`
   - Busca mensajes de error en rojo

3. **Secrets no configurados**
   - Verifica: `supabase secrets list`
   - Debe aparecer `KAPSO_API_KEY`

**Solución:**

```bash
# Re-desplegar la función
supabase functions deploy kapso-webhook

# Revisar logs en tiempo real
supabase functions logs kapso-webhook --tail
```

### Error: "Invalid email"

El email debe tener el formato correcto: `usuario@dominio.com`

**Ejemplos válidos:**

- ✅ juan@gmail.com
- ✅ maria.lopez@empresa.com

**Ejemplos inválidos:**

- ❌ juan@gmail (falta extensión)
- ❌ juan.com (falta @)
- ❌ @gmail.com (falta usuario)

### No se guardan los datos en Supabase

**Verifica:**

1. **Credenciales de Supabase**

   - La Edge Function usa las credenciales automáticas de Supabase
   - No necesitas configurar nada adicional

2. **Tabla creada correctamente**

   ```bash
   # Ver tablas en tu base de datos
   supabase db pull
   ```

3. **Permisos RLS (Row Level Security)**
   - La migración ya incluye las políticas necesarias
   - Si modificaste algo, revisa en Supabase Dashboard → Authentication → Policies

### Error: "Failed to send message via Kapso"

**Causas:**

1. **KAPSO_API_KEY incorrecto**

   ```bash
   # Actualizar el secret
   supabase secrets set KAPSO_API_KEY=tu_api_key_correcta

   # Re-desplegar
   supabase functions deploy kapso-webhook
   ```

2. **phoneNumberId inválido**

   - Verifica que el número esté conectado en Kapso Dashboard
   - Usa el ID del Sandbox si estás en pruebas

3. **Rate limits de Kapso**
   - En el plan gratuito hay límites de mensajes/día
   - Revisa tu uso en Kapso Dashboard

### Los botones no aparecen

WhatsApp tiene restricciones para mensajes interactivos:

- Solo se pueden enviar a números verificados
- Algunos clientes de WhatsApp antiguos no los soportan
- Debe estar dentro de la ventana de 24 horas (mensajes proactivos)

**Solución temporal**: Usar mensajes de texto simple en lugar de botones.

## 🔧 Problemas Comunes y Soluciones

Durante la implementación de este ejercicio, pueden surgir varios problemas. Aquí están los más comunes y sus soluciones:

### 🚨 Error: Missing Authorization Header (401)

Cuando despliegas la Edge Function y haces una petición de prueba:

```bash
curl https://tu-proyecto.supabase.co/functions/v1/kapso-webhook
{"code":401,"message":"Missing authorization header"}
```

**Solución:** Desplegar con el flag `--no-verify-jwt`:
```bash
npx supabase functions deploy kapso-webhook --no-verify-jwt
```

### 🚨 Error 404 al Enviar Mensajes

En los logs de Supabase ves:
```
Error al enviar mensaje: 404 The page you were looking for doesn't exist
```

**Causa:** Falta `/v21.0/` en la URL de la API de Kapso.

**Solución:** La URL correcta debe ser:
```
https://api.kapso.ai/meta/whatsapp/v21.0/{phoneNumberId}/messages
```

### 🚨 Error: Invalid Credentials (401)

```
Error al enviar mensaje: 401 {"error":"Invalid credentials for WhatsApp configuration"}
```

**Causa:** Header de autorización incorrecto.

**Solución:** Kapso usa `X-API-Key` no `Authorization: Bearer`. Verificar que el código use:
```typescript
headers: {
  'X-API-Key': kapsoApiKey  // ✅ Correcto
}
```

### 🚨 El Bot Saltó un Paso en la Conversación

Enviaste "Hola" pero el bot pidió email en lugar de nombre.

**Causa:** Ya existe un lead en la base de datos de una prueba anterior.

**Solución:** Envía `reset` desde WhatsApp para reiniciar la conversación.

### 🚨 Paquete @kapso/whatsapp-cloud-api No Se Instala

```
npm error notarget No matching version found for @kapso/whatsapp-cloud-api@^1.0.0
```

**Solución:** Usar la versión correcta `0.1.1`:
```json
"@kapso/whatsapp-cloud-api": "^0.1.1"
```

### 🚨 Supabase CLI No Se Instala con npm

```
npm error Installing Supabase CLI as a global module is not supported
```

**Solución:** Usar uno de estos métodos:
- Homebrew: `brew install supabase/tap/supabase`
- Binario directo desde [GitHub Releases](https://github.com/supabase/cli/releases)
- npx: `npx supabase login`

### 📖 Guía Completa de Troubleshooting

Para una guía detallada con todos los problemas y soluciones, consulta [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## 🎓 Siguientes Pasos

Una vez que domines este ejercicio, puedes:

1. **Agregar más campos**: Empresa, cargo, presupuesto, etc.
2. **Integrar con CRM**: Enviar leads a HubSpot, Salesforce, etc.
3. **Usar AI**: Integrar GPT para respuestas más inteligentes
4. **Notificaciones**: Enviar email/Slack cuando llega un nuevo lead
5. **Analytics**: Dashboard para visualizar métricas de conversión
6. **Multi-idioma**: Detectar idioma y responder en consecuencia
7. **Templates**: Usar plantillas pre-aprobadas de WhatsApp

## 📚 Recursos Adicionales

- [Documentación de Kapso](https://docs.kapso.ai)
- [Documentación de Supabase](https://supabase.com/docs)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Deno Deploy (Edge Functions)](https://deno.com/deploy)

## 🤝 Contribuir

Si encuentras errores o tienes sugerencias:

1. Fork este repositorio
2. Crea una rama: `git checkout -b feature/mejora`
3. Commit: `git commit -m 'Mejora X'`
4. Push: `git push origin feature/mejora`
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT.

---

**¿Preguntas o problemas?** Abre un issue en GitHub o consulta la documentación oficial de Kapso y Supabase.

¡Feliz coding! 🚀
