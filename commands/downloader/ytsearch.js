const axios = require('axios')

module.exports = {
  name: 'ytsearch',
  async execute(sock, msg, args) {
    const from = msg.key.remoteJid
    const query = args.join(' ')
    if (!query) return sock.sendMessage(from, { text: 'Enter song name' })

    const url = `https://ytsearch-api.vercel.app/search?q=${encodeURIComponent(query)}`
    const { data } = await axios.get(url)

    if (!data.result?.length) {
      return sock.sendMessage(from, { text: 'No results found' })
    }

    const video = data.result[0]

    const text = `
🎬 ${video.title}
⏱ ${video.duration}
👁 ${video.views}

🔗 ${video.url}
`

    await sock.sendMessage(from, { text })
  }
  }
