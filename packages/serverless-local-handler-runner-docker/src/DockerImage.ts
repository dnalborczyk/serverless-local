import execa from 'execa'
import promiseMemoize from 'p-memoize'
import { debugLog } from '@serverless-local/helpers'

export default class DockerImage {
  private static _memoizedPull = promiseMemoize(DockerImage._pullImage)

  readonly #imageNameTag: string

  constructor(imageNameTag: string) {
    this.#imageNameTag = imageNameTag
  }

  static async _pullImage(imageNameTag: string): Promise<void> {
    debugLog(`Downloading base Docker image... (${imageNameTag})`)

    try {
      await execa('docker', [
        'pull',
        '--disable-content-trust=false',
        imageNameTag,
      ])
    } catch (err) {
      console.error(err.stderr)
      throw err
    }
  }

  async pull(): Promise<void> {
    return DockerImage._memoizedPull(this.#imageNameTag)
  }
}
