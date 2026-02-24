module.exports = {
  name: 'ping',
  description: 'Check bot speed',
  async execute(sock, msg) {
    const from = msg.key.remoteJid
    const start = Date.now()
    const sent = await sock.sendMessage(from, { text: '🏓 Pong...' })
    const speed = Date.now() - start
    await sock.sendMessage(from, { text: `⚡ Speed: ${speed}ms` })
  }
}
