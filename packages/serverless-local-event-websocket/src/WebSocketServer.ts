import type { Server } from 'http'
import { Server as WsServer } from 'ws'
import type WebSocketClients from './WebSocketClients'
import serverlessLog from '@serverless-local/logger'
import { createUniqueId, debugLog } from '@serverless-local/helpers'

export default class WebSocketServer {
  readonly #options = null
  readonly #webSocketClients: WebSocketClients

  constructor(
    options,
    webSocketClients: WebSocketClients,
    sharedServer: Server,
  ) {
    this.#options = options
    this.#webSocketClients = webSocketClients

    const server = new WsServer({
      server: sharedServer,
    })

    server.on('connection', (webSocketClient, request) => {
      console.log('received connection')

      const connectionId = createUniqueId()

      debugLog(`connect:${connectionId}`)

      this.#webSocketClients.addClient(webSocketClient, request, connectionId)
    })
  }

  async start() {
    const { host, httpsProtocol, websocketPort } = this.#options

    serverlessLog(
      `Offline [websocket] listening on ws${
        httpsProtocol ? 's' : ''
      }://${host}:${websocketPort}`,
    )
  }

  // no-op, we're re-using the http server
  stop(): void {}

  addRoute(functionKey: string, webSocketEvent): void {
    this.#webSocketClients.addRoute(functionKey, webSocketEvent.route)
    // serverlessLog(`route '${route}'`)
  }
}
