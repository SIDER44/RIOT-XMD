const axios = require('axios')

module.exports = {
  name: 'quote',
  async execute(sock, msg) {
    const from = msg.key.remoteJid
    const { data } = await axios.get('https://api.quotable.io/random')
    await sock.sendMessage(from, {
      text: `"${data.content}"\n— ${data.author}`
    })
  }
}
