const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const url = require('url')
// const {
//   config,
//   Wechaty,
//   log,
//   MediaMessage,
// } = require('../../dist/src/index')
const { PuppetPuppeteer } = require('../../dist/src/')
const puppet = new PuppetPuppeteer()
// let window
app.on('ready', () => {
  // window = new BrowserWindow();
  // window.loadURL(url.format({
  //   pathname: path.join(__dirname, './index.html'),
  //   protocol: 'file',
  //   slashes: true
  // }))
  // window.webContents.openDevTools()
  // ipcMain.on("startWechaty", () => {
    initbot()
  // })
})
app.on('window-all-closed', () => {
  app.quit()
})

function initbot () {
  /**
   *
   * 2. Register event handlers for Bot
   *
   */
  puppet
    .on('scan',   onScan)
    .on('logout', onLogout)
    .on('login',  onLogin)
    .on('error',  onError)
    .on('message', onMessage)

  /**
   *
   * 3. Start the bot!
   *
   */
  puppet.start()
    .catch(async e => {
      console.error('Bot start() fail:', e)
      await puppet.stop()
      process.exit(-1)
    })

  /**
   *
   * 4. You are all set. ;-]
   *
   */

  /**
   *
   * 5. Define Event Handler Functions for:
   *  `scan`, `login`, `logout`, `error`, and `message`
   *
   */
  function onScan (qrcode, status) {
    console.log('进入main-onScan')
    // Generate a QR Code online via
    // http://goqr.me/api/doc/create-qr-code/
    const qrcodeImageUrl = [
      'https://api.qrserver.com/v1/create-qr-code/?data=',
      encodeURIComponent(qrcode),
    ].join('')

    console.log(`[${status}] ${qrcodeImageUrl}\nScan QR Code above to log in: `)
  }

  function onLogin (contactId) {
    console.log('进入main-onLogin')
    console.log(`${contactId} login`)
    puppet.messageSendText({ contactId, }, 'Wechaty login').catch(console.error)
  }

  function onLogout (contactId) {
    console.log(`${contactId} logouted`)
  }

  function onError (e) {
    console.error('Bot error:', e)
    /*
    if (bot.logonoff()) {
      bot.say('Wechaty error: ' + e.message).catch(console.error)
    }
    */
  }

  /**
   *
   * 6. The most important handler is for:
   *    dealing with Messages.
   *
   */
  async function onMessage (messageId) {
    console.log('进入main-onMessage')
    console.log(puppet.selfId())
    const payload = await puppet.messagePayload(messageId)
    console.log(JSON.stringify(payload))
  }

//   /**
//    *
//    * 7. Output the Welcome Message
//    *
//    */
//   const welcome = `
// Puppet Version: ${puppet.version()}
//
// Please wait... I'm trying to login in...
//
// `
//   console.log(welcome)

  // const bot = Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })
  //
  // bot
  //   .on('logout', user => log.info('Bot', `${user.name()} logouted`))
  //   .on('login', user => {
  //     log.info('Bot', `${user.name()} login`)
  //     bot.say('Wechaty login').catch(console.error)
  //   })
  //   .on('scan', (url, code) => {
  //     if (!/201|200/.test(String(code))) {
  //       const loginUrl = url.replace(/\/qrcode\//, '/l/')
  //         // QrcodeTerminal.generate(loginUrl)
  //     }
  //     console.log(`${url}\n[${code}] Scan QR Code above url to log in: `)
  //   })
  //   .on('message', async m => {
  //     try {
  //       const room = m.room()
  //       console.log(
  //         (room ? `${room}` : '') +
  //         `${m.from()}:${m}`,
  //       )
  //       if (/^(ding|ping|bing|code)$/i.test(m.content()) && !m.self()) {
  //         m.say('dong')
  //         log.info('Bot', 'REPLY: dong')
  //
  //         const joinWechaty = `Join Wechaty Developers' Community\n\n` +
  //           `Wechaty is used in many ChatBot projects by hundreds of developers.\n\n` +
  //           `If you want to talk with other developers, just scan the following QR Code in WeChat with secret code: wechaty,\n\n` +
  //           `you can join our Wechaty Developers' Home at once`
  //         await m.say(joinWechaty)
  //         await m.say('Scan now, because other Wechaty developers want to talk with you too!\n\n(secret code: wechaty)')
  //         log.info('Bot', 'REPLY: Image')
  //       }
  //     } catch (e) {
  //       log.error('Bot', 'on(message) exception: %s', e)
  //     }
  //   })
  //
  // bot.start()
  //   .catch(e => {
  //     log.error('Bot', 'start() fail: %s', e)
  //     bot.stop()
  //     process.exit(-1)
  //   })
  //
  // bot.on('error', async e => {
  //   log.error('Bot', 'error: %s', e)
  //   if (bot.logonoff()) {
  //     await bot.say('Wechaty error: ' + e.message).catch(console.error)
  //   }
  //   // await bot.stop()
  // })
}
