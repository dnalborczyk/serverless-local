import type { Server } from 'http'
import { Server as HapiServer } from '@hapi/hapi'
import { catchAllRoute, connectionsRoutes } from './http-routes/index'
import type WebSocketClients from './WebSocketClients'
import serverlessLog from '@serverless-local/logger'

export default class HttpServer {
  readonly #options = null
  readonly #server: HapiServer
  readonly #webSocketClients: WebSocketClients

  constructor(options, webSocketClients: WebSocketClients) {
    this.#options = options
    this.#webSocketClients = webSocketClients

    const { host, websocketPort } = options

    const serverOptions = {
      host,
      port: websocketPort,
      router: {
        // allows for paths with trailing slashes to be the same as without
        // e.g. : /my-path is the same as /my-path/
        stripTrailingSlash: true,
      },
    }

    this.#server = new HapiServer(serverOptions)
  }

  async start(): Promise<void> {
    // add routes
    const routes = [
      ...connectionsRoutes(this.#webSocketClients),
      catchAllRoute(),
    ]
    this.#server.route(routes)

    const { host, httpsProtocol, websocketPort } = this.#options

    try {
      await this.#server.start()
    } catch (err) {
      console.error(
        `Unexpected error while starting serverless-offline websocket server on port ${websocketPort}:`,
        err,
      )
      process.exit(1)
    }

    serverlessLog(
      `Offline [http for websocket] listening on http${
        httpsProtocol ? 's' : ''
      }://${host}:${websocketPort}`,
    )
  }

  // stops the server
  stop(timeout: number): Promise<void> {
    return this.#server.stop({
      timeout,
    })
  }

  get server(): Server {
    return this.#server.listener
  }
}
