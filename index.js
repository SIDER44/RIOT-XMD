import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys"

import pino from "pino"
import fs from "fs"
import readline from "readline"

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function askNumber() {
  return new Promise(resolve => {
    rl.question("📱 Enter your WhatsApp number (with country code): ", resolve)
  })
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    logger: pino({ level: "silent" }),
    auth: state,
    printQRInTerminal: false
  })

  // Ask number ONLY if not registered
  if (!state.creds.registered) {
    const number = await askNumber()
    const code = await sock.requestPairingCode(number.replace(/[^0-9]/g, ""))

    console.log("\n🔐 Pairing Code:", code)
    console.log("➡️ Open WhatsApp > Linked Devices > Link with Code\n")
  }

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update

    if (connection === "open") {
      console.log("✅ BOT CONNECTED SUCCESSFULLY")
      rl.close()
    }

    if (connection === "close") {
      const status = lastDisconnect?.error?.output?.statusCode
      console.log("❌ Disconnected:", status)

      // Only reconnect if NOT 401
      if (status !== DisconnectReason.loggedOut) {
        console.log("🔄 Reconnecting...")
        startBot()
      } else {
        console.log("🚫 Session logged out. Delete auth folder and restart.")
      }
    }
  })

  sock.ev.on("creds.update", saveCreds)

  // SIMPLE COMMAND TEST
  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text

    if (text === ".ping") {
      await sock.sendMessage(msg.key.remoteJid, { text: "🏓 Pong!" })
    }
  })
}

startBot()
