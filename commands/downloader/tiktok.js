const axios = require('axios')

module.exports = {
  name: 'tiktok',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid
    const url = args[0]
    if (!url) return sock.sendMessage(from, { text: 'Send TikTok link' })

    const api = `https://api.tiklydown.eu.org/api/download?url=${url}`
    const { data } = await axios.get(api)

    await sock.sendMessage(from, {
      video: { url: data.video.noWatermark },
      caption: '✅ TikTok Downloaded'
    })
  }
  }
