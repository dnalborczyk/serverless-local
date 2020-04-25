import { resolve } from 'path'
import { node } from 'execa'

const childProcessHelperPath = resolve(__dirname, 'childProcessHelper')

export default class ChildProcessRunner {
  readonly #env
  readonly #functionKey: string
  readonly #handlerName: string
  readonly #handlerPath: string
  readonly #timeout: number

  constructor(funOptions, env) {
    const { functionKey, handlerName, handlerPath, timeout } = funOptions

    this.#env = env
    this.#functionKey = functionKey
    this.#handlerName = handlerName
    this.#handlerPath = handlerPath
    this.#timeout = timeout
  }

  // no-op
  // () => void
  cleanup(): void {}

  async run(event, context) {
    const childProcess = node(
      childProcessHelperPath,
      [this.#functionKey, this.#handlerName, this.#handlerPath],
      {
        env: this.#env,
      },
    )

    childProcess.send({
      context,
      event,
      timeout: this.#timeout,
    })

    const message = new Promise((_resolve) => {
      childProcess.on('message', _resolve)
      // TODO
      // on error? on exit? ..
    })

    let result

    try {
      result = await message
    } catch (err) {
      // TODO
      console.log(err)

      throw err
    }

    return result
  }
}
