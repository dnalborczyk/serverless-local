import { platform } from 'os'
import execa from 'execa'
import fetch from 'node-fetch'
import pRetry from 'p-retry'
import DockerImage from './DockerImage.js'
import DockerPort from './DockerPort.js'
import debugLog from '../../../debugLog.js'

const { stringify } = JSON
const { entries } = Object

export default class DockerContainer {
  private static _dockerPort = new DockerPort()

  readonly #env = null
  readonly #functionKey: string
  readonly #handler: string
  readonly #imageNameTag = null
  readonly #image: DockerImage

  #containerId: string
  #port = null

  constructor(env, functionKey: string, handler: string, runtime: string) {
    this.#env = env
    this.#functionKey = functionKey
    this.#handler = handler
    this.#imageNameTag = this._baseImage(runtime)
    this.#image = new DockerImage(this.#imageNameTag)
  }

  private _baseImage(runtime: string): string {
    return `lambci/lambda:${runtime}`
  }

  async start(codeDir: string): Promise<void> {
    const [, port] = await Promise.all([
      this.#image.pull(),
      DockerContainer._dockerPort.get(),
    ])

    debugLog('Run Docker container...')

    // TODO: support layer
    // https://github.com/serverless/serverless/blob/v1.57.0/lib/plugins/aws/invokeLocal/index.js#L291-L293
    const dockerArgs = [
      '-v',
      `${codeDir}:/var/task:ro,delegated`,
      '-p',
      `${port}:9001`,
      '-e',
      'DOCKER_LAMBDA_STAY_OPEN=1', // API mode
    ]

    entries(this.#env).forEach(([key, value]) => {
      dockerArgs.push('-e', `${key}=${value}`)
    })

    if (platform() === 'linux') {
      // Add `host.docker.internal` DNS name to access host from inside the container
      // https://github.com/docker/for-linux/issues/264
      const gatewayIp = await this._getBridgeGatewayIp()
      dockerArgs.push('--add-host', `host.docker.internal:${gatewayIp}`)
    }

    const { stdout: containerId } = await execa('docker', [
      'create',
      ...dockerArgs,
      this.#imageNameTag,
      this.#handler,
    ])

    const dockerStart = execa('docker', ['start', '-a', containerId], {
      all: true,
    })

    await new Promise((resolve, reject) => {
      dockerStart.all.on('data', (data) => {
        const str = data.toString()
        console.log(str)
        if (str.includes('Lambda API listening on port')) {
          resolve()
        }
      })

      dockerStart.on('error', (err) => {
        reject(err)
      })
    })

    this.#containerId = containerId
    this.#port = port

    await pRetry(() => this._ping(), {
      // default,
      factor: 2,
      // milliseconds
      minTimeout: 10,
      // default
      retries: 10,
    })
  }

  private async _getBridgeGatewayIp() {
    let gateway

    try {
      ;({ stdout: gateway } = await execa('docker', [
        'network',
        'inspect',
        'bridge',
        '--format',
        '{{(index .IPAM.Config 0).Gateway}}',
      ]))
    } catch (err) {
      console.error(err.stderr)
      throw err
    }

    return gateway.split('/')[0]
  }

  private async _ping(): Promise<string> {
    const url = `http://localhost:${this.#port}/2018-06-01/ping`
    const res = await fetch(url)

    if (!res.ok) {
      throw new Error(`Failed to fetch from ${url} with ${res.statusText}`)
    }

    return res.text()
  }

  async request(event) {
    const url = `http://localhost:${this.#port}/2015-03-31/functions/${
      this.#functionKey
    }/invocations`
    const res = await fetch(url, {
      body: stringify(event),
      headers: { 'Content-Type': 'application/json' },
      method: 'post',
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch from ${url} with ${res.statusText}`)
    }

    return res.json()
  }

  async stop(): Promise<void> {
    if (this.#containerId) {
      try {
        await execa('docker', ['stop', this.#containerId])
        await execa('docker', ['rm', this.#containerId])
      } catch (err) {
        console.error(err.stderr)
        throw err
      }
    }
  }

  get isRunning(): boolean {
    return this.#containerId !== null && this.#port !== null
  }
}
