import type Serverless from 'serverless'
import WebSocket, { OPEN } from 'ws'
import {
  WebSocketConnectEvent,
  WebSocketDisconnectEvent,
  WebSocketEvent,
} from './lambda-events/index'
import serverlessLog from '@serverless-local/logger'
import {
  DEFAULT_WEBSOCKETS_API_ROUTE_SELECTION_EXPRESSION,
  DEFAULT_WEBSOCKETS_ROUTE,
} from './constants'
import { debugLog, jsonPath } from '@serverless-local/helpers'
import type Lambda from '@serverless-local/handler-lambda'

const { parse, stringify } = JSON

export default class WebSocketClients {
  readonly #clients: Map<string, WebSocket> & Map<WebSocket, string> = new Map()
  readonly #lambda: Lambda
  readonly #options = null
  readonly #webSocketRoutes = new Map()
  readonly #websocketsApiRouteSelectionExpression: string

  constructor(serverless: Serverless, options, lambda: Lambda) {
    this.#lambda = lambda
    this.#options = options
    this.#websocketsApiRouteSelectionExpression =
      // @ts-ignore
      serverless.service.provider.websocketsApiRouteSelectionExpression ||
      DEFAULT_WEBSOCKETS_API_ROUTE_SELECTION_EXPRESSION
  }

  _addWebSocketClient(client: WebSocket, connectionId: string): void {
    this.#clients.set(client, connectionId)
    this.#clients.set(connectionId, client)
  }

  _removeWebSocketClient(client: WebSocket): string {
    const connectionId = this.#clients.get(client)

    this.#clients.delete(client)
    this.#clients.delete(connectionId)

    return connectionId
  }

  _getWebSocketClient(connectionId: string): WebSocket {
    return this.#clients.get(connectionId)
  }

  async _processEvent(
    websocketClient: WebSocket,
    connectionId: string,
    route: string,
    event,
  ) {
    let functionKey = this.#webSocketRoutes.get(route)

    if (!functionKey && route !== '$connect' && route !== '$disconnect') {
      functionKey = this.#webSocketRoutes.get('$default')
    }

    if (!functionKey) {
      return
    }

    const sendError = (err) => {
      if (websocketClient.readyState === OPEN) {
        websocketClient.send(
          stringify({
            connectionId,
            message: 'Internal server error',
            requestId: '1234567890',
          }),
        )
      }

      // mimic AWS behaviour (close connection) when the $connect route handler throws
      if (route === '$connect') {
        websocketClient.close()
      }

      debugLog(`Error in route handler '${functionKey}'`, err)
    }

    const lambdaFunction = this.#lambda.get(functionKey)

    lambdaFunction.setEvent(event)

    // let result

    try {
      /* result = */ await lambdaFunction.runHandler()

      // TODO what to do with "result"?
    } catch (err) {
      console.log(err)
      sendError(err)
    }
  }

  _getRoute(value) {
    let json

    try {
      json = parse(value)
    } catch (err) {
      return DEFAULT_WEBSOCKETS_ROUTE
    }

    const routeSelectionExpression = this.#websocketsApiRouteSelectionExpression.replace(
      'request.body',
      '',
    )

    const route = jsonPath(json, routeSelectionExpression)

    if (typeof route !== 'string') {
      return DEFAULT_WEBSOCKETS_ROUTE
    }

    return route || DEFAULT_WEBSOCKETS_ROUTE
  }

  addClient(webSocketClient: WebSocket, request, connectionId: string): void {
    this._addWebSocketClient(webSocketClient, connectionId)

    const connectEvent = new WebSocketConnectEvent(
      connectionId,
      request,
      this.#options,
    ).create()

    this._processEvent(webSocketClient, connectionId, '$connect', connectEvent)

    webSocketClient.on('close', () => {
      debugLog(`disconnect:${connectionId}`)

      this._removeWebSocketClient(webSocketClient)

      const disconnectEvent = new WebSocketDisconnectEvent(
        connectionId,
      ).create()

      this._processEvent(
        webSocketClient,
        connectionId,
        '$disconnect',
        disconnectEvent,
      )
    })

    webSocketClient.on('message', (message) => {
      debugLog(`message:${message}`)

      const route = this._getRoute(message)

      debugLog(`route:${route} on connection=${connectionId}`)

      const event = new WebSocketEvent(connectionId, route, message).create()

      this._processEvent(webSocketClient, connectionId, route, event)
    })
  }

  addRoute(functionKey: string, route: string): void {
    // set the route name
    this.#webSocketRoutes.set(route, functionKey)

    serverlessLog(`route '${route}'`)
  }

  close(connectionId: string): boolean {
    const client = this._getWebSocketClient(connectionId)

    if (client) {
      client.close()
      return true
    }

    return false
  }

  send(connectionId: string, payload): boolean {
    const client = this._getWebSocketClient(connectionId)

    if (client) {
      client.send(payload)
      return true
    }

    return false
  }
}
