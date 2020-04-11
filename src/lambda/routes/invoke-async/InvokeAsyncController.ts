import type Lambda from '../../../lambda/index'

export default class InvokeAsyncController {
  readonly #lambda: Lambda

  constructor(lambda: Lambda) {
    this.#lambda = lambda
  }

  async invokeAsync(functionName: string, event) {
    const lambdaFunction = this.#lambda.getByFunctionName(functionName)

    lambdaFunction.setEvent(event)

    // don't await result!
    lambdaFunction.runHandler().catch((err) => {
      // TODO handle error
      console.log(err)
      throw err
    })

    return {
      StatusCode: 202,
    }
  }
}
