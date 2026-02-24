import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import QRCode from "qrcode"
import pino from "pino"
import fs from "fs"
import dotenv from "dotenv"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

let qrImage = null

// 🔥 CLEAR BROKEN SESSION (important)
if (!fs.existsSync("./session")) {
  fs.mkdirSync("./session")
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false,
    browser: ["RIOT XMD", "Chrome", "1.0.0"]
  })

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, lastDisconnect } = update

    // 🟩 NEW QR
    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("🟢 NEW QR GENERATED")
    }

    if (connection === "open") {
      console.log("🔥 BOT CONNECTED")
      qrImage = "CONNECTED"
    }

    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode

      console.log("❌ Closed:", code)

      // If logged out → wipe session
      if (code === DisconnectReason.loggedOut) {
        fs.rmSync("./session", { recursive: true, force: true })
        console.log("🧹 Session wiped")
      }

      // Reconnect always
      startBot()
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

startBot()

// 🌐 QR PAGE
app.get("/", (req, res) => {
  res.setHeader("Cache-Control", "no-store")

  res.send(`
  <html>
  <head>
    <title>RIOT XMD QR</title>
    <meta http-equiv="refresh" content="10">
    <style>
      body { background:#000;color:#0f0;text-align:center;font-family:monospace;padding-top:40px }
      img { margin-top:20px }
    </style>
  </head>
  <body>
    <h1>🔥 RIOT XMD LOGIN</h1>
    ${
      qrImage === "CONNECTED"
        ? "<h2>✅ CONNECTED SUCCESSFULLY</h2>"
        : qrImage
        ? `<img src="${qrImage}" width="300"/>`
        : "<h3>Generating QR...</h3>"
    }
    <p>Auto refresh every 10s</p>
  </body>
  </html>
  `)
})

app.listen(PORT, () => console.log("🌐 Web running:", PORT))
