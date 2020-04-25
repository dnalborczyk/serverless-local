import renderVelocityTemplateObject from './renderVelocityTemplateObject'
import VelocityContext from './VelocityContext'

export default class LambdaIntegrationEvent {
  readonly #path: string
  readonly #request = null
  readonly #requestTemplate = null
  readonly #stage: string

  constructor(request, stage: string, requestTemplate, path: string) {
    this.#path = path
    this.#request = request
    this.#requestTemplate = requestTemplate
    this.#stage = stage
  }

  create() {
    const velocityContext = new VelocityContext(
      this.#request,
      this.#stage,
      this.#request.payload || {},
      this.#path,
    ).getContext()

    const event = renderVelocityTemplateObject(
      this.#requestTemplate,
      velocityContext,
    )

    return event
  }
}
