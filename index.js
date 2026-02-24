require('dotenv').config()

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const P = require('pino')
const express = require('express')
const loadCommands = require('./lib/loader')

const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => res.send('RIOT XMD Running 🚀'))
app.listen(PORT, () => console.log('Web server active'))

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

    if (qr) {
      console.log('\n🔗 Scan QR in WhatsApp > Linked Devices\n')
    }

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log('Reconnecting:', shouldReconnect)
      if (shouldReconnect) startBot()
    } else if (connection === 'open') {
      console.log('✅ RIOT XMD CONNECTED')
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

    const args = body.slice(prefix.length).trim().split(/ +/)
    const cmdName = args.shift().toLowerCase()

    const cmd = commands.get(cmdName)
    if (!cmd) return

    try {
      await cmd.execute(sock, msg, args)
    } catch (err) {
      console.log(err)
      await sock.sendMessage(from, { text: '❌ Command error' })
    }
  })
}

startBot()
