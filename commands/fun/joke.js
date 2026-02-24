const axios = require('axios')

module.exports = {
  name: 'joke',
  async execute(sock, msg) {
    const from = msg.key.remoteJid
    const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke')
    await sock.sendMessage(from, {
      text: `${data.setup}\n\n😂 ${data.punchline}`
    })
  }
}
