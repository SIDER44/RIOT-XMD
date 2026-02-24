require('dotenv').config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const P = require('pino')
const fs = require('fs')
const express = require('express')

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.send('RIOT XMD is running 🚀')
})

app.listen(PORT, () => console.log('Web server running'))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['RIOT XMD', 'Chrome', '1.0.0']
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('Disconnected. Reconnecting:', shouldReconnect)

      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ RIOT XMD Connected Successfully')
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ''

    const prefix = process.env.PREFIX || '.'

    if (!body.startsWith(prefix)) return

    const cmd = body.slice(prefix.length).trim().split(' ')[0].toLowerCase()

    if (cmd === 'ping') {
      await sock.sendMessage(from, { text: '🏓 Pong from RIOT XMD' })
    }

    if (cmd === 'menu') {
      await sock.sendMessage(from, {
        text: `🔥 RIOT XMD MENU

.prefix = ${prefix}

Commands:
.ping
.menu

More commands coming soon...`
      })
    }
  })
}

startBot()
