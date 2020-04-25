import { Server } from '@hapi/hapi'
import { invocationsRoute, invokeAsyncRoute } from './routes/index'
import type Lambda from './index'
import serverlessLog from '@serverless-local/logger'

export default class HttpServer {
  readonly #lambda: Lambda
  readonly #options = null
  readonly #server: Server

  constructor(options, lambda: Lambda) {
    this.#lambda = lambda
    this.#options = options

    const { host, lambdaPort } = options

    const serverOptions = {
      host,
      port: lambdaPort,
    }

    this.#server = new Server(serverOptions)
  }

  async start(): Promise<void> {
    // add routes
    const _invocationsRoute = invocationsRoute(this.#lambda)
    const _invokeAsyncRoute = invokeAsyncRoute(this.#lambda)

    this.#server.route([_invokeAsyncRoute, _invocationsRoute])

    const { host, httpsProtocol, lambdaPort } = this.#options

    try {
      await this.#server.start()
    } catch (err) {
      console.error(
        `Unexpected error while starting serverless-offline lambda server on port ${lambdaPort}:`,
        err,
      )
      process.exit(1)
    }

    serverlessLog(
      `Offline [http for lambda] listening on http${
        httpsProtocol ? 's' : ''
      }://${host}:${lambdaPort}`,
    )
  }

  // stops the server
  stop(timeout: number) {
    return this.#server.stop({
      timeout,
    })
  }
}
