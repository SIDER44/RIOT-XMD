process.on('uncaughtException', err => {
  console.log('UNCAUGHT EXCEPTION:', err)
})

process.on('unhandledRejection', err => {
  console.log('UNHANDLED REJECTION:', err)
})
