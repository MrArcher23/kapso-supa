// Supabase Edge Function: Webhook para Kapso WhatsApp
// Este webhook recibe mensajes de WhatsApp y gestiona la conversación para cualificar leads

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

// Tipos para los mensajes de Kapso (formato real)
interface KapsoWebhookPayload {
  message: {
    context?: any
    from: string
    id: string
    kapso: {
      direction: string
      status: string
      processing_status: string
      has_media: boolean
      origin: string
    }
    text?: {
      body: string
    }
    interactive?: {
      button_reply?: {
        id: string
        title: string
      }
      list_reply?: {
        id: string
        title: string
      }
    }
    timestamp: string
    type: 'text' | 'interactive' | 'button'
  }
  conversation: {
    id: string
    contact_name: string
    phone_number: string
    phone_number_id: string
    status: string
  }
  is_new_conversation: boolean
  phone_number_id: string
}

// Estados de la conversación
enum ConversationStep {
  INITIAL = 'INITIAL',
  WAITING_FOR_NAME = 'WAITING_FOR_NAME',
  WAITING_FOR_EMAIL = 'WAITING_FOR_EMAIL',
  WAITING_FOR_INTEREST = 'WAITING_FOR_INTEREST',
  COMPLETED = 'COMPLETED'
}

// Estructura de datos del lead en la conversación
interface LeadData {
  step: ConversationStep
  data: {
    name?: string
    email?: string
    interest?: string
  }
}

// Función principal
serve(async (req) => {
  try {
    // Manejar verificación de webhook (GET)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      // Verificación de webhook de Kapso/Meta
      if (mode === 'subscribe' && token === 'KAPSO_WEBHOOK_TOKEN') {
        console.log('Webhook verificado exitosamente')
        return new Response(challenge, { status: 200 })
      }

      return new Response('Forbidden', { status: 403 })
    }

    // Procesar webhook (POST)
    if (req.method === 'POST') {
      const payload: KapsoWebhookPayload = await req.json()
      console.log('Webhook recibido:', JSON.stringify(payload, null, 2))

      // Validar estructura del payload de Kapso
      if (!payload.message) {
        console.log('No hay mensaje en el payload')
        return new Response('No message', { status: 200 })
      }

      // Procesar el mensaje
      await processMessage(payload)

      return new Response('OK', { status: 200 })
    }

    return new Response('Method not allowed', { status: 405 })
  } catch (error) {
    console.error('Error en webhook:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
})

// Función para procesar cada mensaje
async function processMessage(payload: KapsoWebhookPayload) {
  const { message, phone_number_id } = payload
  const from = message.from
  const messageType = message.type
  let messageBody = ''

  // Extraer el contenido del mensaje según el tipo
  if (messageType === 'text' && message.text) {
    messageBody = message.text.body
  } else if (messageType === 'interactive' && message.interactive?.button_reply) {
    messageBody = message.interactive.button_reply.id
  } else {
    console.log('Tipo de mensaje no soportado:', messageType)
    return
  }

  console.log(`Mensaje recibido de ${from}: ${messageBody}`)

  // Inicializar Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseKey)

  // Obtener o crear el lead
  let { data: lead, error: fetchError } = await supabase
    .from('leads')
    .select('*')
    .eq('phone_number', from)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Error al obtener lead:', fetchError)
    return
  }

  // Si no existe el lead, crearlo
  if (!lead) {
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        phone_number: from,
        conversation_state: {
          step: ConversationStep.INITIAL,
          data: {}
        }
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error al crear lead:', insertError)
      return
    }

    lead = newLead
  }

  // Obtener estado actual de la conversación
  const state: LeadData = lead.conversation_state as LeadData
  console.log(`Estado actual: ${state.step}`)

  // Procesar según el estado
  let responseMessage = ''
  let newState: LeadData = { ...state }
  let useButtons = false
  let buttons: any[] = []

  switch (state.step) {
    case ConversationStep.INITIAL:
      responseMessage = '¡Bienvenido! 👋 Para ayudarte mejor, ¿cuál es tu nombre?'
      newState.step = ConversationStep.WAITING_FOR_NAME
      break

    case ConversationStep.WAITING_FOR_NAME:
      newState.data.name = messageBody
      responseMessage = `Encantado, ${messageBody}. ¿Cuál es tu correo electrónico?`
      newState.step = ConversationStep.WAITING_FOR_EMAIL
      break

    case ConversationStep.WAITING_FOR_EMAIL:
      // Validar email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(messageBody)) {
        responseMessage = 'Por favor, proporciona un correo electrónico válido (ejemplo: usuario@dominio.com)'
        // Mantener el mismo estado
      } else {
        newState.data.email = messageBody
        responseMessage = `Perfecto, ${newState.data.name}. ¿En qué podemos ayudarte?`
        newState.step = ConversationStep.WAITING_FOR_INTEREST
        useButtons = true
        buttons = [
          { id: 'productos', title: '🛍️ Productos' },
          { id: 'precios', title: '💰 Precios' },
          { id: 'llamada', title: '📞 Llamada' }
        ]
      }
      break

    case ConversationStep.WAITING_FOR_INTEREST:
      // Mapear IDs de botones a texto legible
      const interestMap: Record<string, string> = {
        'productos': 'Información sobre productos',
        'precios': 'Consulta de precios',
        'llamada': 'Agendar una llamada',
        'soporte': 'Soporte técnico'
      }
      newState.data.interest = interestMap[messageBody] || messageBody
      responseMessage = '¡Gracias! Hemos registrado tu información. Un miembro de nuestro equipo se pondrá en contacto contigo pronto. ✅'
      newState.step = ConversationStep.COMPLETED
      break

    case ConversationStep.COMPLETED:
      responseMessage = 'Ya hemos registrado tu información. Si necesitas algo más, escríbenos "reset" para empezar de nuevo.'
      if (messageBody.toLowerCase() === 'reset') {
        newState = {
          step: ConversationStep.INITIAL,
          data: {}
        }
        responseMessage = '¡Bienvenido de nuevo! 👋 Para ayudarte mejor, ¿cuál es tu nombre?'
        newState.step = ConversationStep.WAITING_FOR_NAME
      }
      break
  }

  // Actualizar estado en la base de datos
  const updateData: any = {
    conversation_state: newState
  }

  // Si estamos en estado completado, guardar todos los datos
  if (newState.step === ConversationStep.COMPLETED) {
    updateData.name = newState.data.name
    updateData.email = newState.data.email
    updateData.interest = newState.data.interest
  }

  const { error: updateError } = await supabase
    .from('leads')
    .update(updateData)
    .eq('phone_number', from)

  if (updateError) {
    console.error('Error al actualizar lead:', updateError)
  } else {
    console.log('Lead actualizado exitosamente')
  }

  // Enviar respuesta al usuario vía Kapso
  await sendWhatsAppMessage(
    phone_number_id,
    from,
    responseMessage,
    useButtons,
    buttons
  )
}

// Función para enviar mensaje de WhatsApp via Kapso usando su API directamente
async function sendWhatsAppMessage(
  phoneNumberId: string,
  to: string,
  message: string,
  useButtons: boolean = false,
  buttons: any[] = []
) {
  const kapsoApiKey = Deno.env.get('KAPSO_API_KEY')
  const kapsoBaseUrl = Deno.env.get('KAPSO_BASE_URL') || 'https://api.kapso.ai/meta/whatsapp'

  if (!kapsoApiKey) {
    console.error('KAPSO_API_KEY no configurado')
    return
  }

  try {
    const url = `${kapsoBaseUrl}/v21.0/${phoneNumberId}/messages`
    let payload: any

    if (useButtons && buttons.length > 0) {
      // Mensaje con botones interactivos (formato de Kapso)
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: {
            text: message
          },
          action: {
            buttons: buttons.slice(0, 3).map(btn => ({
              type: 'reply',
              reply: {
                id: btn.id,
                title: btn.title
              }
            }))
          }
        }
      }
    } else {
      // Mensaje de texto simple
      payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      }
    }

    console.log(`Enviando mensaje a ${to} via ${url}`)
    console.log('Payload:', JSON.stringify(payload, null, 2))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': kapsoApiKey
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Error al enviar mensaje:', response.status, errorText)
    } else {
      const result = await response.json()
      console.log('Mensaje enviado exitosamente:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('Error al enviar mensaje via Kapso:', error)
  }
}
