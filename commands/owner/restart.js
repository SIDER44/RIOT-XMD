module.exports = {
  name: 'restart',
  async execute(sock, msg) {
    const from = msg.key.remoteJid
    await sock.sendMessage(from, { text: '♻ Restarting bot...' })
    process.exit()
  }
}
