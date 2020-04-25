import { logWarning } from '@serverless-local/logger'
import {
  supportedNodejs,
  supportedPython,
  supportedRuby,
} from './supportedRuntimes'
import { debugLog, satisfiesVersionRange } from '@serverless-local/helpers'

export default class HandlerRunner {
  readonly #env = null
  readonly #funOptions = null
  readonly #options = null
  #runner = null

  constructor(funOptions, options, env) {
    this.#env = env
    this.#funOptions = funOptions
    this.#options = options
  }

  private async _loadRunner() {
    const { useDocker, useChildProcesses, useWorkerThreads } = this.#options

    const {
      functionKey,
      handlerName,
      handlerPath,
      runtime,
      timeout,
    } = this.#funOptions

    debugLog(`Loading handler... (${handlerPath})`)

    if (useDocker) {
      const { default: DockerRunner } = await import(
        '@serverless-local/handler-runner-docker'
      )
      return new DockerRunner(this.#funOptions, this.#env)
    }

    if (supportedNodejs.has(runtime)) {
      if (useChildProcesses) {
        const { default: ChildProcessRunner } = await import(
          '@serverless-local/handler-runner-child-process'
        )
        return new ChildProcessRunner(this.#funOptions, this.#env)
      }

      if (useWorkerThreads) {
        // worker threads
        this._verifyWorkerThreadCompatibility()

        const { default: WorkerThreadRunner } = await import(
          '@serverless-local/handler-runner-docker'
        )
        return new WorkerThreadRunner(this.#funOptions, this.#env)
      }

      const { default: InProcessRunner } = await import(
        '@serverless-local/handler-runner-in-process'
      )
      return new InProcessRunner(
        functionKey,
        handlerPath,
        handlerName,
        this.#env,
        timeout,
      )
    }

    if (supportedPython.has(runtime)) {
      const { default: PythonRunner } = await import(
        '@serverless-local/handler-runner-python'
      )
      return new PythonRunner(this.#funOptions, this.#env)
    }

    if (supportedRuby.has(runtime)) {
      const { default: RubyRunner } = await import(
        '@serverless-local/handler-runner-ruby'
      )
      return new RubyRunner(this.#funOptions, this.#env)
    }

    // TODO FIXME
    throw new Error('Unsupported runtime')
  }

  private _verifyWorkerThreadCompatibility(): void {
    const { node: currentVersion } = process.versions
    const requiredVersionRange = '>=11.7.0'

    const versionIsSatisfied = satisfiesVersionRange(
      currentVersion,
      requiredVersionRange,
    )

    // we're happy
    if (!versionIsSatisfied) {
      logWarning(
        `"worker threads" require node.js version ${requiredVersionRange}, but found version ${currentVersion}.
         To use this feature you have to update node.js to a later version.
        `,
      )

      throw new Error(
        '"worker threads" are not supported with this node.js version',
      )
    }
  }

  // TEMP TODO FIXME
  isDockerRunner(): boolean {
    return this.#runner && this.#runner.constructor.name === 'DockerRunner'
  }

  // () => Promise<void>
  cleanup() {
    // TODO console.log('handler runner cleanup')
    return this.#runner.cleanup()
  }

  async run(event, context) {
    if (this.#runner == null) {
      this.#runner = await this._loadRunner()
    }

    return this.#runner.run(event, context)
  }
}
