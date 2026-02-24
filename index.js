import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import express from "express"
import QRCode from "qrcode"
import pino from "pino"
import dotenv from "dotenv"
import fs from "fs"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

let qrImage = "Loading..."

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

    if (qr) {
      qrImage = await QRCode.toDataURL(qr)
      console.log("✅ QR GENERATED")
    }

    if (connection === "open") {
      console.log("🔥 RIOT XMD CONNECTED")
      qrImage = "CONNECTED"
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut

      console.log("❌ Connection closed")

      if (shouldReconnect) {
        console.log("🔄 Reconnecting...")
        startBot()
      } else {
        console.log("🚪 Logged out")
        fs.rmSync("./session", { recursive: true, force: true })
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)
}

startBot()

// 🌐 WEB SERVER FOR QR
app.get("/", (req, res) => {
  res.send(`
  <html>
  <head>
    <title>RIOT XMD QR</title>
    <style>
      body {
        background: #000;
        color: #0f0;
        font-family: monospace;
        text-align: center;
        padding-top: 50px;
      }
      img { margin-top: 20px; }
    </style>
  </head>
  <body>
    <h1>🔥 RIOT XMD LOGIN</h1>
    ${
      qrImage === "CONNECTED"
        ? "<h2>✅ BOT CONNECTED SUCCESSFULLY</h2>"
        : `<img src="${qrImage}" width="300"/>`
    }
  </body>
  </html>
  `)
})

app.listen(PORT, () => {
  console.log("🌐 Web running on port", PORT)
})
