const axios = require('axios')

module.exports = {
  name: 'play',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid
    const query = args.join(' ')
    if (!query) return sock.sendMessage(from, { text: 'Song name?' })

    const search = await axios.get(`https://ytsearch-api.vercel.app/search?q=${encodeURIComponent(query)}`)
    const video = search.data.result[0]

    const dl = await axios.get(`https://ytmp3-api.vercel.app/download?url=${video.url}`)

    await sock.sendMessage(from, {
      audio: { url: dl.data.url },
      mimetype: 'audio/mp4'
    })
  }
      }
