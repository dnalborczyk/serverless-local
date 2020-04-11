import Serverless, { FunctionDefinition } from 'serverless'
import type { Server as HapiServer } from '@hapi/hapi'
import updateNotifier from 'update-notifier'
import debugLog from './debugLog'
import serverlessLog, { logWarning, setLog } from './serverlessLog'
import { satisfiesVersionRange } from './utils/index'
import {
  commandOptions,
  CUSTOM_OPTION,
  defaultOptions,
  SERVER_SHUTDOWN_TIMEOUT,
} from './config/index'
// @ts-ignore
import pkg from '../package.json'
import type Plugin from 'serverless/classes/Plugin'
import type Lambda from './lambda/index'
import type Http from './events/http/index'
import type Schedule from './events/schedule/index'
import type WebSocket from './events/websocket/index'

export interface LambdaCreateOptions {
  functionKey: string
  functionDefinition: FunctionDefinition
}

export interface HttpCreateOptions {
  functionKey: string
  handler: string
  http: any
}

export interface ScheduleCreateOptions {
  functionKey: string
  schedule: any
}

export interface WebSocketCreateOptions {
  functionKey: string
  websocket: any
}

export default class ServerlessOffline implements Plugin {
  readonly #cliOptions
  readonly #serverless: Serverless

  #http: Http
  #options = null
  #schedule: Schedule
  #webSocket: WebSocket
  #lambda: Lambda

  commands: Plugin.Commands
  hooks: Plugin.Hooks

  constructor(serverless: Serverless, cliOptions) {
    this.#cliOptions = cliOptions
    this.#serverless = serverless

    // @ts-ignore
    setLog((...args) => serverless.cli.log(...args))

    this.commands = {
      offline: {
        // add start nested options
        commands: {
          start: {
            lifecycleEvents: ['init', 'end'],
            options: commandOptions,
            usage:
              'Simulates API Gateway to call your lambda functions offline using backward compatible initialization.',
          },
        },
        lifecycleEvents: ['start'],
        options: commandOptions,
        usage: 'Simulates API Gateway to call your lambda functions offline.',
      },
    }

    this.hooks = {
      'offline:start:init': this.start.bind(this),
      'offline:start': this._startWithExplicitEnd.bind(this),
      'offline:start:end': this.end.bind(this),
    }
  }

  private _printBlankLine(): void {
    if (process.env.NODE_ENV !== 'test') {
      console.log()
    }
  }

  // Entry point for the plugin (sls offline) when running 'sls offline start'
  async start(): Promise<void> {
    // check if update is available
    updateNotifier({ pkg }).notify()

    this._verifyServerlessVersionCompatibility()

    this._mergeOptions()

    const {
      httpEvents,
      lambdas,
      scheduleEvents,
      webSocketEvents,
    } = this._getEvents()

    // if (lambdas.length > 0) {
    await this._createLambda(lambdas)
    // }

    const eventModules = []

    if (httpEvents.length > 0) {
      eventModules.push(this._createHttp(httpEvents))
    }

    if (scheduleEvents.length > 0) {
      eventModules.push(this._createSchedule(scheduleEvents))
    }

    if (webSocketEvents.length > 0) {
      eventModules.push(this._createWebSocket(webSocketEvents))
    }

    await Promise.all(eventModules)

    if (process.env.NODE_ENV !== 'test') {
      await this._listenForTermination()
    }
  }

  async end(skipExit?: boolean) {
    // TEMP FIXME
    if (process.env.NODE_ENV === 'test' && skipExit === undefined) {
      return
    }

    serverlessLog('Halting offline server')

    const eventModules = []

    if (this.#lambda) {
      eventModules.push(this.#lambda.cleanup())
      eventModules.push(this.#lambda.stop(SERVER_SHUTDOWN_TIMEOUT))
    }

    if (this.#http) {
      eventModules.push(this.#http.stop(SERVER_SHUTDOWN_TIMEOUT))
    }

    // if (this.#schedule) {
    //   eventModules.push(this.#schedule.stop())
    // }

    if (this.#webSocket) {
      eventModules.push(this.#webSocket.stop(SERVER_SHUTDOWN_TIMEOUT))
    }

    await Promise.all(eventModules)

    if (!skipExit) {
      process.exit(0)
    }
  }

  /**
   * Entry point for the plugin (sls offline) when running 'sls offline'
   * The call to this.end() would terminate the process before 'offline:start:end' could be consumed
   * by downstream plugins. When running sls offline that can be expected, but docs say that
   * 'sls offline start' will provide the init and end hooks for other plugins to consume
   * */
  private async _startWithExplicitEnd(): Promise<void> {
    await this.start()
    this.end()
  }

  private async _listenForTermination(): Promise<void> {
    const command = await new Promise((resolve) => {
      process
        // SIGINT will be usually sent when user presses ctrl+c
        .on('SIGINT', () => resolve('SIGINT'))
        // SIGTERM is a default termination signal in many cases,
        // for example when "killing" a subprocess spawned in node
        // with child_process methods
        .on('SIGTERM', () => resolve('SIGTERM'))
    })

    serverlessLog(`Got ${command} signal. Offline Halting...`)
  }

  private async _createLambda(
    lambdas: LambdaCreateOptions[],
    skipStart?: boolean,
  ): Promise<void> {
    const { default: Lambda } = await import('./lambda/index')

    this.#lambda = new Lambda(this.#serverless, this.#options)

    this.#lambda.create(lambdas)

    if (!skipStart) {
      await this.#lambda.start()
    }
  }

  private async _createHttp(
    events: HttpCreateOptions[],
    skipStart?: boolean,
  ): Promise<void> {
    const { default: Http } = await import('./events/http/index')

    this.#http = new Http(this.#serverless, this.#options, this.#lambda)

    await this.#http.registerPlugins()

    this.#http.create(events)

    // HTTP Proxy defined in Resource
    this.#http.createResourceRoutes()

    // Not found handling
    // we have to create the 404 routes last, otherwise we could have
    // collisions with catch all routes, e.g. any (proxy+}
    this.#http.create404Route()

    if (!skipStart) {
      await this.#http.start()
    }
  }

  private async _createSchedule(
    events: ScheduleCreateOptions[],
  ): Promise<void> {
    const { default: Schedule } = await import('./events/schedule/index')

    this.#schedule = new Schedule(
      this.#lambda,
      this.#serverless.service.provider.region,
    )

    this.#schedule.create(events)
  }

  private async _createWebSocket(
    events: WebSocketCreateOptions[],
  ): Promise<[void, void]> {
    const { default: WebSocket } = await import('./events/websocket/index')

    this.#webSocket = new WebSocket(
      this.#serverless,
      this.#options,
      this.#lambda,
    )

    this.#webSocket.create(events)

    return this.#webSocket.start()
  }

  private _mergeOptions(): void {
    const {
      service: { custom = {}, provider },
    } = this.#serverless

    const customOptions = custom[CUSTOM_OPTION]

    // merge options
    // order of Precedence: command line options, custom options, defaults.
    this.#options = {
      ...defaultOptions,
      ...customOptions,
      ...this.#cliOptions,
    }

    // Parse CORS options
    this.#options.corsAllowHeaders = this.#options.corsAllowHeaders
      .replace(/\s/g, '')
      .split(',')
    this.#options.corsAllowOrigin = this.#options.corsAllowOrigin
      .replace(/\s/g, '')
      .split(',')
    this.#options.corsExposedHeaders = this.#options.corsExposedHeaders
      .replace(/\s/g, '')
      .split(',')

    if (this.#options.corsDisallowCredentials) {
      this.#options.corsAllowCredentials = false
    }

    this.#options.corsConfig = {
      credentials: this.#options.corsAllowCredentials,
      exposedHeaders: this.#options.corsExposedHeaders,
      headers: this.#options.corsAllowHeaders,
      origin: this.#options.corsAllowOrigin,
    }

    serverlessLog(`Starting Offline: ${provider.stage}/${provider.region}.`)
    debugLog('options:', this.#options)
  }

  private _getEvents() {
    const { service } = this.#serverless

    // for simple API Key authentication model
    // @ts-ignore
    if (service.provider.apiKeys) {
      serverlessLog(`Key with token: ${this.#options.apiKey}`)

      if (this.#options.noAuth) {
        serverlessLog(
          'Authorizers are turned off. You do not need to use x-api-key header.',
        )
      } else {
        serverlessLog('Remember to use x-api-key on the request headers')
      }
    }

    const httpEvents: HttpCreateOptions[] = []
    const lambdas: LambdaCreateOptions[] = []
    const scheduleEvents: ScheduleCreateOptions[] = []
    const webSocketEvents: WebSocketCreateOptions[] = []

    const functionKeys = service.getAllFunctions()

    functionKeys.forEach((functionKey) => {
      // TODO re-activate?
      // serverlessLog(`Routes for ${functionKey}:`)
      const functionDefinition = service.getFunction(functionKey)

      lambdas.push({ functionKey, functionDefinition })

      const events = service.getAllEventsInFunction(functionKey)

      events.forEach((event) => {
        const { http, schedule, websocket } = event as any // TODO FIXME

        if (http) {
          httpEvents.push({
            functionKey,
            handler: functionDefinition.handler,
            http,
          })
        }

        if (schedule) {
          scheduleEvents.push({ functionKey, schedule })
        }

        if (websocket) {
          webSocketEvents.push({ functionKey, websocket })
        }
      })
    })

    return {
      httpEvents,
      lambdas,
      scheduleEvents,
      webSocketEvents,
    }
  }

  // TEMP FIXME quick fix to expose gateway server for testing, look for better solution
  getApiGatewayServer(): HapiServer {
    return this.#http.getServer()
  }

  // TODO: missing tests
  private _verifyServerlessVersionCompatibility(): void {
    const currentVersion = this.#serverless.version
    const requiredVersionRange = pkg.peerDependencies.serverless

    const versionIsSatisfied = satisfiesVersionRange(
      currentVersion,
      requiredVersionRange,
    )

    if (!versionIsSatisfied) {
      logWarning(
        `serverless-offline requires serverless version ${requiredVersionRange} but found version ${currentVersion}.
         Be aware that functionality might be limited or contains bugs.
         To avoid any issues update serverless to a later version.
        `,
      )
    }
  }
}
