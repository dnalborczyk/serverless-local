import { createHash } from 'crypto'

export default function createApiKey(): string {
  return createHash('md5').digest('hex')
}
