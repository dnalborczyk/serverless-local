const { assign } = Object

export default class WebSocketEventDefinition {
  readonly route: string

  constructor(rawWebSocketEventDefinition) {
    let rest
    let route: string

    if (typeof rawWebSocketEventDefinition === 'string') {
      route = rawWebSocketEventDefinition
    } else {
      ;({ route, ...rest } = rawWebSocketEventDefinition)
    }

    this.route = route

    assign(this, rest)
  }
}
