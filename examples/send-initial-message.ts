/**
 * Script de ejemplo para enviar mensaje inicial via Kapso
 * 
 * Este script demuestra cómo usar la API de Kapso (WhatsApp Cloud API) directamente
 * para enviar mensajes de WhatsApp de forma programática usando fetch.
 * 
 * Uso:
 *   npm run example
 */

import * as dotenv from 'dotenv'

// Cargar variables de entorno
dotenv.config()

// Validar variables de entorno
const KAPSO_API_KEY = process.env.KAPSO_API_KEY
const KAPSO_PHONE_NUMBER_ID = process.env.KAPSO_PHONE_NUMBER_ID
const KAPSO_BASE_URL = process.env.KAPSO_BASE_URL || 'https://api.kapso.ai/meta/whatsapp'

if (!KAPSO_API_KEY || !KAPSO_PHONE_NUMBER_ID) {
  console.error('❌ Error: Faltan variables de entorno')
  console.error('Por favor configura KAPSO_API_KEY y KAPSO_PHONE_NUMBER_ID en tu archivo .env')
  process.exit(1)
}

/**
 * Función helper para hacer requests a la API de Kapso
 */
async function kapsoRequest(endpoint: string, body: any) {
  const url = `${KAPSO_BASE_URL}/${KAPSO_PHONE_NUMBER_ID}/${endpoint}`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KAPSO_API_KEY}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Kapso API Error: ${response.status} - ${error}`)
  }

  return response.json()
}

/**
 * Envía un mensaje de texto simple
 */
async function sendTextMessage(to: string, message: string) {
  try {
    console.log(`📤 Enviando mensaje a ${to}...`)
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: {
        preview_url: false,
        body: message
      }
    }

    const response = await kapsoRequest('messages', payload)

    console.log('✅ Mensaje enviado exitosamente')
    console.log('ID del mensaje:', response.messages?.[0]?.id)
    return response
  } catch (error) {
    console.error('❌ Error al enviar mensaje:', error)
    throw error
  }
}

/**
 * Envía un mensaje con botones interactivos
 */
async function sendButtonMessage(
  to: string, 
  bodyText: string, 
  buttons: Array<{id: string, title: string}>
) {
  try {
    console.log(`📤 Enviando mensaje con botones a ${to}...`)
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: bodyText
        },
        action: {
          buttons: buttons.slice(0, 3).map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id,
              title: btn.title.substring(0, 20) // Max 20 caracteres
            }
          }))
        }
      }
    }

    const response = await kapsoRequest('messages', payload)

    console.log('✅ Mensaje con botones enviado exitosamente')
    console.log('ID del mensaje:', response.messages?.[0]?.id)
    return response
  } catch (error) {
    console.error('❌ Error al enviar mensaje con botones:', error)
    throw error
  }
}

/**
 * Envía una imagen
 */
async function sendImageMessage(to: string, imageUrl: string, caption?: string) {
  try {
    console.log(`📤 Enviando imagen a ${to}...`)
    
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption })
      }
    }

    const response = await kapsoRequest('messages', payload)

    console.log('✅ Imagen enviada exitosamente')
    console.log('ID del mensaje:', response.messages?.[0]?.id)
    return response
  } catch (error) {
    console.error('❌ Error al enviar imagen:', error)
    throw error
  }
}

/**
 * Función principal de ejemplo
 */
async function main() {
  console.log('🚀 Iniciando ejemplo de Kapso WhatsApp\n')

  // IMPORTANTE: Cambia este número por tu número de WhatsApp de prueba
  // Formato: código de país + número (sin +, espacios o guiones)
  // Ejemplo: '521234567890' para México
  const testPhoneNumber = '1234567890' // ⚠️ CAMBIAR ESTE NÚMERO

  if (testPhoneNumber === '1234567890') {
    console.error('\n⚠️  ADVERTENCIA: Por favor cambia testPhoneNumber en el script')
    console.error('    con tu número real de WhatsApp antes de ejecutar.')
    console.error('    Formato: código de país + número (ejemplo: 521234567890)\n')
    return
  }

  try {
    // Ejemplo 1: Enviar mensaje de texto simple
    console.log('--- Ejemplo 1: Mensaje de texto ---')
    await sendTextMessage(
      testPhoneNumber,
      '¡Hola! Este es un mensaje de prueba desde Kapso. 👋'
    )
    console.log('')

    // Esperar 2 segundos entre mensajes
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Ejemplo 2: Enviar mensaje con botones
    console.log('--- Ejemplo 2: Mensaje con botones ---')
    await sendButtonMessage(
      testPhoneNumber,
      '¿En qué podemos ayudarte hoy?',
      [
        { id: 'info', title: 'Más información' },
        { id: 'contact', title: 'Contactar' },
        { id: 'support', title: 'Soporte' }
      ]
    )
    console.log('')

    // Ejemplo 3: Enviar imagen (descomenta para probar)
    /*
    console.log('--- Ejemplo 3: Enviar imagen ---')
    await sendImageMessage(
      testPhoneNumber,
      'https://picsum.photos/800/600',
      'Esta es una imagen de ejemplo 📸'
    )
    console.log('')
    */

    console.log('✅ Todos los ejemplos ejecutados exitosamente')
    console.log('\n💡 Revisa WhatsApp para ver los mensajes recibidos')
    
  } catch (error) {
    console.error('\n❌ Error en la ejecución:', error)
    process.exit(1)
  }
}

// Ejecutar si es el módulo principal
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Error fatal:', error)
    process.exit(1)
  })
}

// Exportar funciones para uso en otros módulos
export {
  sendTextMessage,
  sendButtonMessage,
  sendImageMessage
}
