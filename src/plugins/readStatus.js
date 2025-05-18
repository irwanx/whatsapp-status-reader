import { config } from "../../config.js"

export default async function statusLogger({ m, sock }) {
  if(config.autoReadStory === false) return
  if (m.chat !== 'status@broadcast') return

  const isProtocolMessage = m.raw?.message?.protocolMessage
  if (isProtocolMessage) return

  const participant = m.key?.participant || m.chat || 'unknown'

  console.log(`📷 Lihat status: ${m.name} (${participant.split('@')[0]})`)

  await sock.readMessages([m.key])
}
