import { BrowserWindow, WebContents, Cookie, ipcMain } from 'electron';
import { setTimeout } from 'timers';
// @ts-ignore
import  * as _  from 'lodash'
export class Browser {
  public options: any
  // @ts-ignore
  constructor(options) {
  }
  public async close(): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve();
    })
  }
  public async version(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      return  resolve('version');
    })
  }

  public async newPage(): Promise<Page> {
    return new Promise<Page>((resolve, reject) => {
      return resolve(new Page(this.options))
    })
  }
}
export class Dialog {
  // @ts-ignore
  public type: string
  public message(): string {
    return 'message'
  }
  public async accept(): Promise<any> {
    return new Promise((resolve, reject) => {
      return resolve()
    })
  }
}
export class ElementHandle {
  public click() {
    return null
  }
}
// @ts-ignore
export async function launch(options): Promise<Browser> {
  return new Browser(options)
}
export class Page {
  public win: BrowserWindow
  public web: WebContents
  // @ts-ignore
  constructor(opt) {
    opt = opt || {}

    opt = _.assign({}, {webPreferences: {
      allowRunningInsecureContent: true,
    }})
    this.win = new BrowserWindow({
      width: 1000,
      height: 700,
      minWidth: 720,
      minHeight: 450,
      show: false,
    })
    this.web = this.win.webContents;
    this.web.openDevTools();

    this.win.once('ready-to-show', () => {
      this.win.show()
    })
  }

  public async close(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.win.close()
      resolve();
    })
  }
  public url(): string {
    return this.web.getURL()
  }

  public async evaluate(params: string): Promise<any> {
      return new Promise((resolve, reject) => {
        this.web.executeJavaScript(params, false, (result) => {
          // console.log(result)
          return resolve(result)
        })
      })
  }

  public async exposeFunction(fname: string, callback: Function): Promise<any> {
    return new Promise((resolve, reject) => {
      return resolve()
    })
  }
  /**
   *
   * @param {'load'} eventName
   * @param callback
   */
  public on (eventName: string, callback: Function) {
    if (eventName === 'load') {
// @ts-ignore
      this.web.addListener('did-finish-load', (event) => {
        console.log('触发一次完成回调')
        callback()
      })
    }
    if (eventName === 'error') {
      this.web.addListener('crashed', (event, killed) => {
        callback(event)
     })
    }
  }
  public bindEvent(eventName: string, callback: Function) {
    // @ts-ignore
    ipcMain.on( eventName, (event, args) => {
      callback(eventName, args)
    })
  }

  public async goto(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.web.on('did-fail-load', (event, errorCode, errorMessage) => {
        console.log('fail')
        reject(errorMessage)
      })
      // @ts-ignore
      this.web.on('did-finish-load', (event) => {
        console.log('lodapage')
        resolve()
      })
      try {
        console.log('加载url')
        this.web.loadURL(url)
      } catch (e) {
        console.log(e)
      }
    })
  }

  public async setCookie(...args: Cookie[]): Promise<any> {
    return new Promise((resolve, reject) => {
      args.forEach((value) => {
        // console.log(value)
        this.web.session.cookies.set( _.assign({url: 'http://wx.qq.com' }, value), (err) => {
          console.log(value, err)

          reject()
        })
      })
      return resolve()
    })
  }

  public async reload(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.win.reload()
      return resolve()
    })
  }
  public async send(event: string, ...args: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      // @ts-ignore
      ipcMain.once(`bridge-${event}`, (evt, arg) => {
        resolve(arg)
      })
      this.web.send('bridge', {
        method: event,
        args: args.length > 0 ? args : null,
      })
    })
  }
  // @ts-ignore
  public async waitForFunction(code: string): Promise<boolean> {
      return new Promise<boolean>((resolve, reject) => {
        this.web.executeJavaScript(code, false, (result) => {
          if (result.toString() === 'true') {
            resolve(true)
          } else {
            setTimeout(() => {
              resolve(false)
            }, 100)
          }
        })
        // return resolve('message')
      })

  }
  public async cookies(filter: any): Promise<Cookie[]> {
    return new Promise<Cookie[]>((resolve, reject) => {
      this.web.session.cookies.get(filter, (error, cookies) => {
        if (error) {
          reject(error)
        } else {
          resolve(cookies)
        }
      });
    })
  }
}
export default{
  Browser,
  Dialog,
  ElementHandle,
  launch,
  Page,
}
