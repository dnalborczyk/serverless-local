import type WebSocketClients from '../../WebSocketClients'

export default class ConnectionsController {
  readonly #webSocketClients: WebSocketClients

  constructor(webSocketClients: WebSocketClients) {
    this.#webSocketClients = webSocketClients
  }

  send(connectionId: string, payload): boolean {
    // TODO, is this correct?
    if (!payload) {
      return null
    }

    const clientExisted = this.#webSocketClients.send(
      connectionId,
      // payload is a Buffer
      payload.toString('utf-8'),
    )

    return clientExisted
  }

  remove(connectionId: string): boolean {
    const clientExisted = this.#webSocketClients.close(connectionId)

    return clientExisted
  }
}
