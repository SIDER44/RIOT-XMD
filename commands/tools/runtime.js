const moment = require('moment')

module.exports = {
  name: 'runtime',
  async execute(sock, msg) {
    const from = msg.key.remoteJid
    const uptime = process.uptime()
    const time = moment.utc(uptime * 1000).format('HH:mm:ss')
    await sock.sendMessage(from, { text: `⏱ Runtime: ${time}` })
  }
  }
