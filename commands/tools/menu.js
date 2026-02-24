module.exports = {
  name: 'menu',
  async execute(sock, msg) {
    const from = msg.key.remoteJid

    const menu = `
🔥 RIOT XMD MENU

.tools
.ping
.menu

More commands loading...
`

    await sock.sendMessage(from, { text: menu })
  }
}
