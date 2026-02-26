import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import pino from "pino"
import fs from "fs"
import path from "path"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000
const PREFIX = process.env.PREFIX || "."

let sock
let pairingCode = "Loading..."
let commands = new Map()

// ================= LOAD COMMANDS =================
async function loadCommands() {
  commands.clear()
  const cmdPath = path.join(process.cwd(), "commands")

  const walk = async (dir) => {
    const files = fs.readdirSync(dir)
    for (let file of files) {
      const full = path.join(dir, file)
      if (fs.statSync(full).isDirectory()) await walk(full)
      else if (file.endsWith(".js")) {
        const mod = await import(`file://${full}?v=${Date.now()}`)
        const cmd = mod.default
        if (cmd?.name) commands.set(cmd.name, cmd)
      }
    }
  }

  await walk(cmdPath)
  console.log("✅ Commands loaded:", commands.size)
}

// ================= START BOT =================
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

  // 🔐 PAIRING CODE GENERATOR
  if (!sock.authState.creds.registered) {
    const code = await sock.requestPairingCode(
      process.env.OWNER_NUMBER.replace(/\D/g, "")
    )
    pairingCode = code
    console.log("🔐 Pairing Code:", code)
  }

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("🔥 RIOT XMD CONNECTED")
      pairingCode = "CONNECTED"
      await loadCommands()
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode
      console.log("Disconnected:", code)

      if (code === DisconnectReason.loggedOut) {
        fs.rmSync("./session", { recursive: true, force: true })
      }

      startBot()
    }
  })

  sock.ev.on("creds.update", saveCreds)

  // ================= MESSAGE HANDLER =================
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const from = msg.key.remoteJid
    const body =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    if (!body.startsWith(PREFIX)) return

    const args = body.slice(1).trim().split(/ +/)
    const name = args.shift().toLowerCase()

    const cmd = commands.get(name)
    if (!cmd) {
      return sock.sendMessage(from, { text: "❌ Command not found" })
    }

    try {
      await cmd.execute({ sock, from, args, PREFIX })
    } catch (e) {
      console.log(e)
      sock.sendMessage(from, { text: "⚠️ Command error" })
    }
  })
}

startBot()

// ================= WEB PAGE =================
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <meta http-equiv="refresh" content="15">
    <style>
      body { background:#000;color:#0f0;text-align:center;font-family:monospace;padding-top:60px }
      .code { font-size:40px; letter-spacing:5px; margin-top:20px }
    </style>
  </head>
  <body>
    <h1>🔥 RIOT XMD PAIRING</h1>
    ${
      pairingCode === "CONNECTED"
        ? "<h2>✅ CONNECTED SUCCESSFULLY</h2>"
        : `<div class="code">${pairingCode}</div>`
    }
    <p>Refreshes every 15 seconds</p>
  </body>
  </html>
  `)
})

app.listen(PORT, () => console.log("🌐 Server running:", PORT))
