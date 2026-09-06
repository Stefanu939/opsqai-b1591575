import { createEmailWebhookHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'

type Reason = 'bounce' | 'complaint' | 'unsubscribe'

const LOG_STATUS: Record<Reason, 'bounced' | 'complained' | 'suppressed'> = {
  bounce: 'bounced',
  complaint: 'complained',
  unsubscribe: 'suppressed',
}

const LOG_MESSAGE: Record<Reason, string> = {
  bounce: 'Permanent bounce — email address is invalid or rejected',
  complaint: 'Spam complaint — recipient marked email as spam',
  unsubscribe: 'Recipient unsubscribed',
}

/**
 * Records the outcome in the project's own history tables (notification only).
 * Lovable already enforces suppression at send time — these rows never gate a send.
 */
async function record(
  reason: Reason,
  recipient: string,
  messageId: string | null,
  eventId: string,
): Promise<void> {
  const mod = await import('@/lib/providers/cloud/service-role.server')
  const supabase = mod.createServiceRoleClient()
  const email = recipient.toLowerCase()

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert({ email, reason, metadata: null }, { onConflict: 'email' })
  if (suppressError) {
    console.error('Failed to record suppression', {
      code: suppressError.code,
      message: suppressError.message,
      event_id: eventId,
    })
    throw new Error('suppression_write_failed')
  }

  const { error: logError } = await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: 'system',
    recipient_email: email,
    status: LOG_STATUS[reason],
    error_message: LOG_MESSAGE[reason],
    metadata: null,
  })
  if (logError) {
    console.error('Failed to record email history entry', {
      code: logError.code,
      message: logError.message,
      event_id: eventId,
    })
    throw new Error('email_log_write_failed')
  }
}

export const Route = createFileRoute("/lovable/email/events")({
  server: {
    handlers: {
      POST: ({ request }) => {
        const apiKey = process.env['LOVABLE_API_KEY']
        if (!apiKey) {
          console.error('Missing required environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }
        const handler = createEmailWebhookHandler({
          apiKey,
          on: {
            'email.bounced': async (event) => {
              await record('bounce', event.data.recipient, event.data.message_id ?? null, event.event_id)
            },
            'email.complaint': async (event) => {
              await record('complaint', event.data.recipient, event.data.message_id ?? null, event.event_id)
            },
            'email.unsubscribed': async (event) => {
              await record('unsubscribe', event.data.recipient, event.data.message_id ?? null, event.event_id)
            },
          },
        })
        return handler(request)
      },
    },
  },
})
