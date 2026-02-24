const fs = require('fs')
const path = require('path')

module.exports = function loadCommands() {
  const commands = new Map()

  const base = path.join(__dirname, '../commands')

  function read(dir) {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const full = path.join(dir, file)
      const stat = fs.statSync(full)

      if (stat.isDirectory()) read(full)
      else if (file.endsWith('.js')) {
        const cmd = require(full)
        if (cmd.name) commands.set(cmd.name, cmd)
      }
    }
  }

  read(base)
  return commands
      }
