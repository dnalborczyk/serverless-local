import cuid from 'cuid'

export default function createUniqueId(): string {
  return cuid()
}
