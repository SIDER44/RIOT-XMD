import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import pino from "pino"
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const PREFIX = process.env.PREFIX || "."

let sock
let pairingCode = "Initializing..."
let isPairingRequested = false

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
    browser: ["RIOT XMD", "Chrome", "1.0.0"]
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "connecting") {
      console.log("🔄 Connecting...")
    }

    // 🔐 Request pairing ONLY when socket ready
    if (!state.creds.registered && !isPairingRequested) {
      try {
        isPairingRequested = true
        const code = await sock.requestPairingCode(
          process.env.OWNER_NUMBER.replace(/\D/g, "")
        )
        pairingCode = code
        console.log("🔐 Pairing Code:", code)
      } catch (err) {
        console.log("Pairing error:", err?.output?.statusCode)
        pairingCode = "Retrying..."
        isPairingRequested = false
      }
    }

    if (connection === "open") {
      console.log("✅ CONNECTED SUCCESSFULLY")
      pairingCode = "CONNECTED"
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode
      console.log("❌ Disconnected:", status)

      // If logged out wipe session
      if (status === DisconnectReason.loggedOut) {
        fs.rmSync("./session", { recursive: true, force: true })
      }

      isPairingRequested = false
      setTimeout(startBot, 5000) // wait 5s before reconnect
    }
  })

  sock.ev.on("creds.update", saveCreds)

  // Simple working test command
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (text === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" })
    }
  })
}

startBot()

// 🌐 WEB PANEL
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <meta http-equiv="refresh" content="15">
    <style>
      body { background:#000;color:#0f0;text-align:center;font-family:monospace;padding-top:60px }
      .code { font-size:40px; letter-spacing:6px; margin-top:20px }
    </style>
  </head>
  <body>
    <h1>🔥 RIOT XMD PAIRING</h1>
    ${
      pairingCode === "CONNECTED"
        ? "<h2>✅ CONNECTED</h2>"
        : `<div class="code">${pairingCode}</div>`
    }
  </body>
  </html>
  `)
})

app.listen(PORT, () => console.log("🌐 Running on port", PORT))
