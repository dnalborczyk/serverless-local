import type Serverless from 'serverless'
import type { Server as HapiServer } from '@hapi/hapi'
import HttpEventDefinition from './HttpEventDefinition'
import HttpServer from './HttpServer'
import type Lambda from '../../lambda/index'
import type { HttpCreateOptions } from '../../ServerlessOffline'

export default class Http {
  readonly #httpServer: HttpServer

  constructor(serverless: Serverless, options, lambda: Lambda) {
    this.#httpServer = new HttpServer(serverless, options, lambda)
  }

  start(): Promise<void> {
    return this.#httpServer.start()
  }

  // stops the server
  stop(timeout: number): Promise<void> {
    return this.#httpServer.stop(timeout)
  }

  private _create(
    functionKey: string,
    rawHttpEventDefinition,
    handler: string,
  ): void {
    const httpEvent = new HttpEventDefinition(rawHttpEventDefinition)

    this.#httpServer.createRoutes(functionKey, httpEvent, handler)
  }

  create(events: HttpCreateOptions[]): void {
    events.forEach(({ functionKey, handler, http }) => {
      this._create(functionKey, http, handler)
    })

    this.#httpServer.writeRoutesTerminal()
  }

  createResourceRoutes(): void {
    this.#httpServer.createResourceRoutes()
  }

  create404Route(): void {
    this.#httpServer.create404Route()
  }

  registerPlugins(): Promise<void> {
    return this.#httpServer.registerPlugins()
  }

  // TEMP FIXME quick fix to expose gateway server for testing, look for better solution
  getServer(): HapiServer {
    return this.#httpServer.getServer()
  }
}
