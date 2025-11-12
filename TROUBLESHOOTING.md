# 🔧 Guía de Troubleshooting - Kapso + Supabase

Esta guía documenta todos los problemas comunes que puedes encontrar durante la implementación y sus soluciones.

## 📋 Tabla de Contenidos

1. [Instalación de Dependencias](#instalación-de-dependencias)
2. [Configuración de Supabase CLI](#configuración-de-supabase-cli)
3. [Despliegue de Edge Functions](#despliegue-de-edge-functions)
4. [Errores de API de Kapso](#errores-de-api-de-kapso)
5. [Problemas de Conversación](#problemas-de-conversación)

---

## 🔴 Instalación de Dependencias

### Problema 1: `npm install -g supabase` No Funciona

**Error:**
```bash
npm error Installing Supabase CLI as a global module is not supported.
```

**Causa:** Supabase CLI ya no se puede instalar vía npm global desde versiones recientes.

**Solución:**

**Opción A: Descargar binario (Linux/Windows)**
```bash
# Linux
wget https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz
tar -xzf supabase_linux_amd64.tar.gz
sudo mv supabase /usr/local/bin/
supabase --version
```

**Opción B: Usar Homebrew (macOS/Linux)**
```bash
brew install supabase/tap/supabase
```

**Opción C: Usar npx (sin instalación)**
```bash
npx supabase login
npx supabase link --project-ref TU_PROJECT_REF
```

---

### Problema 2: Paquete `@kapso/whatsapp-cloud-api` No Existe

**Error:**
```bash
npm error notarget No matching version found for @kapso/whatsapp-cloud-api@^1.0.0
```

**Causa:** La versión correcta es `0.1.1`, no `1.0.0`.

**Solución:**

En `package.json`:
```json
{
  "dependencies": {
    "@kapso/whatsapp-cloud-api": "^0.1.1"  // ← Versión correcta
  }
}
```

Luego:
```bash
npm install
```

---

## 🔴 Configuración de Supabase CLI

### Problema 3: Access Token Not Provided

**Error:**
```bash
Access token not provided. Supply an access token by running supabase login
```

**Causa:** No has autenticado Supabase CLI con tu cuenta.

**Solución:**
```bash
# Autenticarte (abre el navegador)
npx supabase login

# Luego vincular el proyecto
npx supabase link --project-ref TU_PROJECT_REF
```

---

## 🔴 Despliegue de Edge Functions

### Problema 4: Missing Authorization Header (401)

**Error:**
```bash
curl https://tu-proyecto.supabase.co/functions/v1/kapso-webhook
{"code":401,"message":"Missing authorization header"}
```

**Causa:** Por defecto, las Edge Functions requieren autenticación JWT de Supabase. Los webhooks externos (como Kapso) no tienen este token.

**Solución:**

Desplegar con el flag `--no-verify-jwt`:
```bash
npx supabase functions deploy kapso-webhook --no-verify-jwt
```

**Verificar que funciona:**
```bash
curl -X GET 'https://tu-proyecto.supabase.co/functions/v1/kapso-webhook?hub.mode=subscribe&hub.verify_token=KAPSO_WEBHOOK_TOKEN&hub.challenge=test123'
# Debería devolver: test123
```

---

### Problema 5: Errores de TypeScript en el Editor

**Error en VSCode/Cursor:**
```
Cannot find module 'https://deno.land/std@0.168.0/http/server.ts'
```

**Causa:** Tu editor usa el compilador de TypeScript de Node.js, pero el código es para Deno.

**Solución:**

**NO es un error real** - El código funciona perfectamente en Supabase (que usa Deno).

**Para silenciar el error (opcional):**
```typescript
// @ts-nocheck
// Agregar al inicio del archivo
```

---

## 🔴 Errores de API de Kapso

### Problema 6: Error 404 al Enviar Mensajes

**Error en logs:**
```
Error al enviar mensaje: 404 <html>The page you were looking for doesn't exist</html>
```

**Causa:** URL incorrecta. Falta `/v21.0/` en el path.

**URL Incorrecta:**
```
https://api.kapso.ai/meta/whatsapp/597907523413541/messages  ❌
```

**URL Correcta:**
```
https://api.kapso.ai/meta/whatsapp/v21.0/597907523413541/messages  ✅
                                   ^^^^^^^^
```

**Solución:**

En `index.ts`:
```typescript
const url = `${kapsoBaseUrl}/v21.0/${phoneNumberId}/messages`
```

---

### Problema 7: Invalid Credentials (401)

**Error en logs:**
```
Error al enviar mensaje: 401 {"error":"Invalid credentials for WhatsApp configuration"}
```

**Causa:** Header de autorización incorrecto.

**Header Incorrecto:**
```typescript
'Authorization': `Bearer ${kapsoApiKey}`  ❌
```

**Header Correcto:**
```typescript
'X-API-Key': kapsoApiKey  ✅
```

**Solución:**

Según la [documentación de Kapso](https://docs.kapso.ai/docs/whatsapp/send-messages/text), usar `X-API-Key`:

```typescript
const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': kapsoApiKey  // ← Correcto
  },
  body: JSON.stringify(payload)
})
```

---

### Problema 8: Formato de Webhook Incorrecto

**Error:** El webhook recibe mensajes pero no los procesa correctamente.

**Causa:** Kapso usa un formato diferente al estándar de Meta WhatsApp Cloud API.

**Formato Estándar de Meta (NO funciona):**
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [...]
      }
    }]
  }]
}
```

**Formato de Kapso (correcto):**
```json
{
  "message": {
    "from": "529933419833",
    "text": {
      "body": "Hola"
    },
    "type": "text"
  },
  "phone_number_id": "597907523413541"
}
```

**Solución:**

La interfaz en `index.ts` debe coincidir con el formato de Kapso:
```typescript
interface KapsoWebhookPayload {
  message: {
    from: string
    text?: { body: string }
    interactive?: { button_reply?: { id: string } }
    type: string
  }
  phone_number_id: string
}
```

---

## 🔴 Problemas de Conversación

### Problema 9: El Bot Saltó un Paso

**Síntoma:** Enviaste "Hola" pero el bot pidió email en lugar de nombre.

**Causa:** Ya existe un lead en la base de datos de una prueba anterior, y está en medio del flujo (ej: `WAITING_FOR_EMAIL`).

**Solución A: Comando Reset**
```
Envía desde WhatsApp: reset
```

El bot responderá:
```
¡Bienvenido de nuevo! 👋 Para ayudarte mejor, ¿cuál es tu nombre?
```

**Solución B: Eliminar Lead en Supabase**
1. Ve a Supabase Dashboard → Table Editor → `leads`
2. Busca tu número de teléfono
3. Elimina la fila
4. Envía "Hola" de nuevo

---

### Problema 10: El Bot Guardó el Mensaje Incorrecto

**Síntoma:** "Hola" quedó guardado como nombre.

**Causa:** Enviaste varios mensajes muy rápido sin esperar respuestas.

**Solución:**

⏱️ **Espera la respuesta del bot** antes de enviar el siguiente mensaje:

```
Tú: Hola
     ⏳ ESPERA respuesta del bot
Bot: ¡Bienvenido! 👋 ¿Cuál es tu nombre?
     ⏳ ESPERA antes de responder
Tú: Juan Pérez
     ⏳ ESPERA respuesta del bot
Bot: Encantado, Juan Pérez. ¿Cuál es tu correo?
```

---

## 🔴 Verificación y Debugging

### Ver Logs de Edge Function en Tiempo Real

**Desde Supabase Dashboard:**
1. Ve a **Edge Functions**
2. Click en **kapso-webhook**
3. Ve a la pestaña **Logs** o **Invocations**
4. Actualiza mientras envías mensajes de WhatsApp

**Logs exitosos se ven así:**
```
✅ Webhook recibido: {...}
✅ Mensaje recibido de 529933419833: Hola
✅ Estado actual: INITIAL
✅ Lead actualizado exitosamente
✅ Enviando mensaje a 529933419833 via https://...
✅ Mensaje enviado exitosamente: {...}
```

---

### Verificar Secrets Configurados

```bash
npx supabase secrets list
```

Deberías ver:
```
KAPSO_API_KEY
KAPSO_BASE_URL (opcional)
```

**Si faltan:**
```bash
npx supabase secrets set KAPSO_API_KEY=tu_api_key_real
npx supabase secrets set KAPSO_BASE_URL=https://api.kapso.ai/meta/whatsapp
```

---

### Verificar Webhook en Kapso

**Dashboard de Kapso → Webhooks**

Debe mostrar:
- ✅ **Estado:** Active o Verified
- ✅ **URL:** `https://tu-proyecto.supabase.co/functions/v1/kapso-webhook`
- ✅ **Evento:** Message received (marcado)

---

## 🔴 Problemas Comunes de WhatsApp

### El Bot No Responde en WhatsApp

**Checklist de verificación:**

1. ✅ **¿Estás enviando al número correcto?**
   - Sandbox: Número de prueba de Kapso (ej: +1 555-XXX-XXXX)
   - NO tu número personal

2. ✅ **¿Conectaste tu WhatsApp al Sandbox?**
   - Kapso Dashboard → Sandbox
   - Enviar código de verificación

3. ✅ **¿El webhook está Active en Kapso?**
   - Dashboard → Webhooks → Verificar estado

4. ✅ **¿La Edge Function está desplegada con --no-verify-jwt?**
   ```bash
   npx supabase functions deploy kapso-webhook --no-verify-jwt
   ```

5. ✅ **¿Los secrets están configurados?**
   ```bash
   npx supabase secrets list
   ```

---

### Botones No Aparecen en WhatsApp

**Causa:** WhatsApp tiene restricciones para mensajes interactivos.

**Restricciones:**
- Máximo 3 botones por mensaje
- Título del botón: máximo 20 caracteres
- Solo funcionan dentro de ventana de 24 horas
- Algunos clientes antiguos no los soportan

**Solución:** El código ya limita a 3 botones y 20 caracteres:
```typescript
buttons: buttons.slice(0, 3).map(btn => ({
  type: 'reply',
  reply: {
    id: btn.id,
    title: btn.title.substring(0, 20)  // ← Limita a 20 caracteres
  }
}))
```

---

## 📊 Comandos Útiles

### Verificar Todo Está Funcionando

```bash
# 1. Funciones desplegadas
npx supabase functions list

# 2. Secrets configurados
npx supabase secrets list

# 3. Test del webhook
curl -X GET 'https://TU_PROYECTO.supabase.co/functions/v1/kapso-webhook?hub.mode=subscribe&hub.verify_token=KAPSO_WEBHOOK_TOKEN&hub.challenge=test'

# 4. Ver base de datos
npx supabase db pull
```

---

## 🆘 Soporte Adicional

Si sigues teniendo problemas:

1. **Revisa los logs en Supabase Dashboard**
2. **Verifica la configuración de Kapso**
3. **Consulta la documentación oficial:**
   - [Kapso Docs](https://docs.kapso.ai)
   - [Supabase Docs](https://supabase.com/docs)

---

## ✅ Resumen de Soluciones Rápidas

| Error | Solución Rápida |
|-------|----------------|
| npm install supabase fails | Usar `brew install` o descargar binario |
| @kapso/whatsapp-cloud-api not found | Usar versión `0.1.1` no `1.0.0` |
| 401 Missing authorization | Deploy con `--no-verify-jwt` |
| 404 al enviar mensaje | Agregar `/v21.0/` a la URL |
| 401 Invalid credentials | Usar header `X-API-Key` |
| Bot salta pasos | Enviar "reset" en WhatsApp |
| Botones no aparecen | Verificar límites (3 botones, 20 chars) |

---

**¿Encontraste otro problema?** Abre un issue en GitHub o consulta la documentación actualizada.

