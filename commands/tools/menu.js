module.exports = {
  name: 'menu',
  async execute(sock, msg) {
    const from = msg.key.remoteJid

    const menu = `
🔥 RIOT XMD MENU

🛠 TOOLS
.ping
.runtime
.menu

📥 DOWNLOADERS
.ytsearch
.tiktok
.play

🎉 FUN
.joke
.quote

🤖 AI
.ai

More coming...
`
    await sock.sendMessage(from, { text: menu })
  }
}
