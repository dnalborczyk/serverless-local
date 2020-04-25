import Serverless, { FunctionDefinition } from 'serverless'
import HttpServer from './HttpServer'
import type LambdaFunction from './LambdaFunction'
import LambdaFunctionPool from './LambdaFunctionPool'
import type { LambdaCreateOptions } from '@serverless-local/types'

export default class Lambda {
  readonly #httpServer: HttpServer
  readonly #lambdas: Map<string, FunctionDefinition> = new Map()
  readonly #lambdaFunctionNamesKeys: Map<string, string> = new Map()
  readonly #lambdaFunctionPool: LambdaFunctionPool

  constructor(serverless: Serverless, options) {
    this.#httpServer = new HttpServer(options, this)
    this.#lambdaFunctionPool = new LambdaFunctionPool(serverless, options)
  }

  private _create(
    functionKey: string,
    functionDefinition: FunctionDefinition,
  ): void {
    this.#lambdas.set(functionKey, functionDefinition)
    this.#lambdaFunctionNamesKeys.set(functionDefinition.name, functionKey)
  }

  create(lambdas: LambdaCreateOptions[]): void {
    lambdas.forEach(({ functionKey, functionDefinition }) => {
      this._create(functionKey, functionDefinition)
    })
  }

  get(functionKey: string): LambdaFunction {
    const functionDefinition = this.#lambdas.get(functionKey)
    return this.#lambdaFunctionPool.get(functionKey, functionDefinition)
  }

  getByFunctionName(functionName: string): LambdaFunction {
    const functionKey = this.#lambdaFunctionNamesKeys.get(functionName)
    return this.get(functionKey)
  }

  start(): Promise<void> {
    return this.#httpServer.start()
  }

  // stops the server
  stop(timeout: number): Promise<void> {
    return this.#httpServer.stop(timeout)
  }

  cleanup() {
    return this.#lambdaFunctionPool.cleanup()
  }
}
