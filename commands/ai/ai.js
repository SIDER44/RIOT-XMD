const axios = require('axios')

module.exports = {
  name: 'ai',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid
    const q = args.join(' ')
    if (!q) return sock.sendMessage(from, { text: 'Ask something' })

    const api = `https://api.simsimi.net/v2/?text=${encodeURIComponent(q)}&lc=en`
    const { data } = await axios.get(api)

    await sock.sendMessage(from, { text: data.success })
  }
      }
