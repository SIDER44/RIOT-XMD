require('dotenv').config()
require('./lib/crash')

const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')

const P = require('pino')
const express = require('express')
const QRCode = require('qrcode')
const loadCommands = require('./lib/loader')

// ================= WEB SERVER =================

const app = express()
const PORT = process.env.PORT || 3000

let latestQR = null
let botStatus = "Starting..."

app.get('/', async (req, res) => {
  if (!latestQR) {
    return res.send(`
    <h2>🔥 RIOT XMD</h2>
    <p>Status: ${botStatus}</p>
    <p>QR not generated yet. Refresh...</p>
    `)
  }

  const img = await QRCode.toDataURL(latestQR)
  res.send(`
    <h2>🔥 RIOT XMD PAIRING</h2>
    <p>Status: ${botStatus}</p>
    <img src="${img}" width="300"/>
    <p>Scan with WhatsApp → Linked Devices</p>
  `)
})

app.listen(PORT, () => console.log("🌐 Web server ready"))

// ================= BOT =================

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

    // SAVE QR FOR BROWSER
    if (qr) {
      latestQR = qr
      botStatus = "Waiting for scan..."
      console.log("✅ QR ready at your Render URL")
    }

    if (connection === 'open') {
      botStatus = "Connected ✅"
      latestQR = null
      console.log("🔥 RIOT XMD CONNECTED")
    }

    if (connection === 'close') {
      botStatus = "Reconnecting..."
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      if (shouldReconnect) startBot()
    }
  })

  // ================= MESSAGE HANDLER =================

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
      console.log("❌ Error:", err)
    }
  })
}

startBot()
