import { URL } from 'url'
import { BASE_URL_PLACEHOLDER } from './constants'

const { fromEntries } = Object

export default function parseQueryStringParameters(url: string) {
  // dummy placeholder url for the WHATWG URL constructor
  // https://github.com/nodejs/node/issues/12682
  const { searchParams } = new URL(url, BASE_URL_PLACEHOLDER)

  if (Array.from(searchParams).length === 0) {
    return null
  }

  return fromEntries(searchParams)
}
