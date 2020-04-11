import { EOL, platform } from 'os'
import { delimiter, join, relative, resolve } from 'path'
import execa from 'execa'

const { parse, stringify } = JSON
const { cwd } = process
const { has } = Reflect

export default class PythonRunner {
  readonly #env = null
  readonly #handlerName: string
  readonly #handlerPath: string
  readonly #runtime: string

  constructor(funOptions, env) {
    const { handlerName, handlerPath, runtime } = funOptions

    this.#env = env
    this.#handlerName = handlerName
    this.#handlerPath = handlerPath
    this.#runtime = runtime
  }

  // no-op
  // () => void
  cleanup(): void {}

  private _parsePayload(value: string) {
    let payload

    for (const item of value.split(EOL)) {
      let json

      // first check if it's JSON
      try {
        json = parse(item)
        // nope, it's not JSON
      } catch (err) {
        // no-op
      }

      // now let's see if we have a property __offline_payload__
      if (
        json &&
        typeof json === 'object' &&
        has(json, '__offline_payload__')
      ) {
        payload = json.__offline_payload__
        // everything else is print(), logging, ...
      } else {
        console.log(item)
      }
    }

    return payload
  }

  // invokeLocalPython, loosely based on:
  // https://github.com/serverless/serverless/blob/v1.50.0/lib/plugins/aws/invokeLocal/index.js#L410
  // invoke.py, copy/pasted entirely as is:
  // https://github.com/serverless/serverless/blob/v1.50.0/lib/plugins/aws/invokeLocal/invoke.py
  async run(event, context) {
    const runtime = platform() === 'win32' ? 'python.exe' : this.#runtime

    const input = stringify({
      context,
      event,
    })

    if (process.env.VIRTUAL_ENV) {
      const runtimeDir = platform() === 'win32' ? 'Scripts' : 'bin'
      process.env.PATH = [
        join(process.env.VIRTUAL_ENV, runtimeDir),
        delimiter,
        process.env.PATH,
      ].join('')
    }

    const [pythonExecutable] = runtime.split('.')

    const python = execa(
      pythonExecutable,
      [
        '-u',
        resolve(__dirname, 'invoke.py'),
        relative(cwd(), this.#handlerPath),
        this.#handlerName,
      ],
      {
        env: this.#env,
        input,
        // shell: true,
      },
    )

    let result

    try {
      result = await python
    } catch (err) {
      // TODO
      console.log(err)

      throw err
    }

    const { stderr, stdout } = result

    if (stderr) {
      // TODO
      console.log(stderr)
    }

    try {
      return this._parsePayload(stdout)
    } catch (err) {
      // TODO
      console.log('No JSON')

      // TODO return or re-throw?
      return err
    }
  }
}
