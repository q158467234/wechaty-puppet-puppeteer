/**
 *   Wechaty - https://github.com/chatie/wechaty
 *
 *   @copyright 2016-2018 Huan LI <zixia@zixia.net>
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 *
 */
import {
  WatchdogFood,
}                 from 'watchdog'

import {
  log,
}                 from './config'
// import {
//   PuppetScanEvent,
// }                 from 'wechaty-puppet'

import {
  Firer,
}                         from './firer'
import {
  PuppetPuppeteer,
}                         from './puppet-puppeteer'
import {
  WebMessageRawPayload,
  WebMessageType,
}                         from './web-schemas'

/* tslint:disable:variable-name */
export const Event = {
  onDing,

  onLog,
  onLogin,
  onLogout,

  onMessage,
  onScan,
  onUnload,

}

function onDing (
  this: PuppetPuppeteer,
  data: any,
): void {
  log.silly('PuppetPuppeteerEvent', 'onDing(%s)', data)
  this.emit('watchdog', { data })
}

async function onScan (
  this    : PuppetPuppeteer,
  // Do not use PuppetScanPayload at here, use { code: number, url: string } instead,
  //  because this is related with Browser Hook Code:
  //    wechaty-bro.js
  payloadFromBrowser : { code: number, url: string },
): Promise<void> {
  log.verbose('PuppetPuppeteerEvent', 'onScan({code: %d, url: %s})', payloadFromBrowser.code, payloadFromBrowser.url)

  // if (this.state.off()) {
  //   log.verbose('PuppetPuppeteerEvent', 'onScan(%s) state.off()=%s, NOOP',
  //                                 payload, this.state.off())
  //   return
  // }

  this.scanPayload = {
    qrcode: payloadFromBrowser.url,
    status: payloadFromBrowser.code,
  }

  /**
   * When wx.qq.com push a new QRCode to Scan, there will be cookie updates(?)
   */
  await this.saveCookie()

  if (this.logonoff()) {
    log.verbose('PuppetPuppeteerEvent', 'onScan() there has user when got a scan event. emit logout and set it to null')
    await this.logout()
  }

  // feed watchDog a `scan` type of food
  const food: WatchdogFood = {
    data: payloadFromBrowser,
    type: 'scan',
  }
  this.emit('watchdog', food)

  const qrcode = payloadFromBrowser.url.replace(/\/qrcode\//, '/l/')
  const status = payloadFromBrowser.code

  this.emit('scan', qrcode, status)
}

function onLog (data: any): void {
  log.silly('PuppetPuppeteerEvent', 'onLog(%s)', data)
}

async function onLogin (
  this: PuppetPuppeteer,
  note: string,
  ttl = 30,
): Promise<void> {
  log.verbose('PuppetPuppeteerEvent', 'onLogin(%s, %d)', note, ttl)
  console.log('进入event-onLogin')
  const TTL_WAIT_MILLISECONDS = 1 * 1000
  if (ttl <= 0) {
    log.verbose('PuppetPuppeteerEvent', 'onLogin(%s) TTL expired')
    this.emit('error', new Error('onLogin() TTL expired.'))
    return
  }

  // if (this.state.off()) {
  //   log.verbose('PuppetPuppeteerEvent', 'onLogin(%s, %d) state.off()=%s, NOOP',
  //                                 note, ttl, this.state.off())
  //   return
  // }

  if (this.logonoff()) {
    throw new Error('onLogin() user had already logined: ' + this.selfId())
    // await this.logout()
  }

  this.scanPayload = undefined

  try {
    /**
     * save login user id to this.userId
     *
     * issue #772: this.bridge might not inited if the 'login' event fired too fast(because of auto login)
     */
    console.log('进行获取getUserName')
    const userId = await this.bridge.getUserName()
    console.log('userId:' + userId)
    if (!userId) {
      console.log('userId不存在，重新登录')
      log.verbose('PuppetPuppeteerEvent', 'onLogin() browser not fully loaded(ttl=%d), retry later', ttl)
      // const html = await this.bridge.innerHTML()
      // log.silly('PuppetPuppeteerEvent', 'onLogin() innerHTML: %s', html.substr(0, 500))
      setTimeout(onLogin.bind(this, note, ttl - 1), TTL_WAIT_MILLISECONDS)
      return
    }

    log.silly('PuppetPuppeteerEvent', 'bridge.getUserName: %s', userId)

    // const user = this.Contact.load(userId)
    // await user.ready()

    log.silly('PuppetPuppeteerEvent', `onLogin() user ${userId} logined`)
    console.log('saveCookie事件')
    // if (this.state.on() === true) {
    await this.saveCookie()
    // }
    console.log('waitStable事件')
    // fix issue #668
    await this.waitStable()
    console.log('EVENT事件里面的login')
    await this.login(userId)

  } catch (e) {
    log.error('PuppetPuppeteerEvent', 'onLogin() exception: %s', e)
    throw e
  }

  return
}

async function onLogout (
  this: PuppetPuppeteer,
  data: any,
): Promise<void> {
  log.verbose('PuppetPuppeteerEvent', 'onLogout(%s)', data)

  if (this.logonoff()) {
    await this.logout()
  } else {
    // not logged-in???
    log.error('PuppetPuppeteerEvent', 'onLogout() without self-user')
  }
}

async function onMessage (
  this       : PuppetPuppeteer,
  rawPayload : WebMessageRawPayload,
): Promise<void> {
  const firer = new Firer(this)

  /**
   * Fire Events if match message type & content
   */
  switch (rawPayload.MsgType) {

    case WebMessageType.VERIFYMSG:
      this.emit('friendship', rawPayload.MsgId)
      // firer.checkFriendRequest(rawPayload)
      break

    case WebMessageType.SYS:
      /**
       * /^@@/.test() return true means it's a room
       */
      if (/^@@/.test(rawPayload.FromUserName)) {
        const joinResult  = await firer.checkRoomJoin(rawPayload)
        const leaveResult = await firer.checkRoomLeave(rawPayload)
        const topicRestul = await firer.checkRoomTopic(rawPayload)

        if (!joinResult && !leaveResult && !topicRestul) {
          log.silly('PuppetPuppeteerEvent', `checkRoomSystem message: <${rawPayload.Content}> not found`)
        }
      } else {
        await firer.checkFriendConfirm(rawPayload)
      }
      break
  }

  this.emit('message', rawPayload.MsgId)
}

async function onUnload (this: PuppetPuppeteer): Promise<void> {
  console.log('执行eventunload')
  this.unload()
  log.silly('PuppetPuppeteerEvent', 'onUnload()')
  /*
  try {
    await this.quit()
    await this.init()
  } catch (e) {
    log.error('PuppetPuppeteerEvent', 'onUnload() exception: %s', e)
    this.emit('error', e)
    throw e
  }
  */
}
