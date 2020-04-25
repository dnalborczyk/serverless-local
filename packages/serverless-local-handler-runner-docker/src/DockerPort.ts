import Queue from 'p-queue'
import { getPortPromise } from 'portfinder'
import { DEFAULT_DOCKER_CONTAINER_PORT } from './constants'

export default class DockerPort {
  private static _queue = new Queue({ concurrency: 1 })
  private static _portScanStart = DEFAULT_DOCKER_CONTAINER_PORT

  async get() {
    return DockerPort._queue.add(async () => {
      const port = await getPortPromise({ port: DockerPort._portScanStart })
      DockerPort._portScanStart = port + 1
      return port
    })
  }
}
