import type Serverless from 'serverless'
import HttpServer from './HttpServer'
import WebSocketEventDefinition from './WebSocketEventDefinition'
import WebSocketClients from './WebSocketClients'
import WebSocketServer from './WebSocketServer'
import type Lambda from '../../lambda/index'
import type { WebSocketCreateOptions } from '../../ServerlessOffline'

export default class WebSocket {
  readonly #httpServer: HttpServer
  readonly #webSocketServer: WebSocketServer

  constructor(serverless: Serverless, options, lambda: Lambda) {
    const webSocketClients = new WebSocketClients(serverless, options, lambda)

    this.#httpServer = new HttpServer(options, webSocketClients)

    // share server
    this.#webSocketServer = new WebSocketServer(
      options,
      webSocketClients,
      this.#httpServer.server,
    )
  }

  start() {
    return Promise.all([
      this.#httpServer.start(),
      this.#webSocketServer.start(),
    ])
  }

  // stops the server
  stop(timeout: number) {
    return Promise.all([
      this.#httpServer.stop(timeout),
      this.#webSocketServer.stop(),
    ])
  }

  private _create(functionKey: string, rawWebSocketEventDefinition): void {
    const webSocketEvent = new WebSocketEventDefinition(
      rawWebSocketEventDefinition,
    )

    this.#webSocketServer.addRoute(functionKey, webSocketEvent)
  }

  create(events: WebSocketCreateOptions[]): void {
    events.forEach(({ functionKey, websocket }) => {
      this._create(functionKey, websocket)
    })
  }
}
