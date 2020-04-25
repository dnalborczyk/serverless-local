import { debugLog } from '@serverless-local/helpers'

export default function catchAllRoute() {
  return {
    method: 'GET',
    path: '/{path*}',
    handler(request, h) {
      const { url } = request

      debugLog(`got GET to ${url}`)

      return h.response(null).code(426)
    },
  }
}
