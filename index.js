require('dotenv').config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const P = require('pino')
const express = require('express')
const qrcode = require('qrcode-terminal')
const loadCommands = require('./lib/loader')

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => res.send('RIOT XMD Alive 🚀'))
app.listen(PORT, () => console.log('🌐 Web server running'))

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['RIOT XMD', 'Chrome', '1.0.0']
  })

  const commands = loadCommands()

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    // QR CODE
    if (qr) {
      console.log('\n📱 Scan QR below:\n')
      qrcode.generate(qr, { small: true })
    }

    // CONNECTION HANDLING
    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('⚠️ Disconnected. Reconnecting:', shouldReconnect)
      if (shouldReconnect) startBot()
    }

    if (connection === 'open') {
      console.log('✅ RIOT XMD CONNECTED SUCCESSFULLY')
    }
  })

  // MESSAGE HANDLER
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message) return

      const from = msg.key.remoteJid
      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        ''

      const prefix = process.env.PREFIX || '.'
      if (!body.startsWith(prefix)) return

      const args = body.slice(prefix.length).trim().split(/ +/)
      const cmdName = args.shift().toLowerCase()

      const cmd = commands.get(cmdName)
      if (!cmd) return

      await cmd.execute(sock, msg, args)

    } catch (err) {
      console.log('❌ Crash prevented:', err)
    }
  })
}

startBot()
