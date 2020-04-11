import boxen from 'boxen'
import chalk from 'chalk'

const { max } = Math

const blue = chalk.keyword('dodgerblue')
const grey = chalk.keyword('grey')
const lime = chalk.keyword('lime')
const orange = chalk.keyword('orange')
const peachpuff = chalk.keyword('peachpuff')
const plum = chalk.keyword('plum')
const red = chalk.keyword('red')
const yellow = chalk.keyword('yellow')

const colorMethodMapping = new Map([
  ['DELETE', red],
  ['GET', blue],
  // ['HEAD', ...],
  ['PATCH', orange],
  ['POST', plum],
  ['PUT', blue],
])

let log

export default function serverlessLog(msg: string): void {
  if (log) {
    log(msg, 'offline')
  }
}

export function setLog(serverlessLogRef) {
  log = serverlessLogRef
}

// logs based on:
// https://github.com/serverless/serverless/blob/master/lib/classes/CLI.js

function logRoute(
  method: string,
  server: string,
  stage: string,
  path: string,
  maxLength: number,
) {
  const methodColor = colorMethodMapping.get(method) ?? peachpuff
  const methodFormatted = method.padEnd(maxLength, ' ')

  return `${methodColor(methodFormatted)} ${yellow.dim('|')} ${grey.dim(
    `${server}/${stage}`,
  )}${lime(path)}`
}

function getMaxHttpMethodNameLength(routeInfo): number {
  return max(...routeInfo.map(({ method }) => method.length))
}

export function logRoutes(routeInfo): void {
  const boxenOptions = {
    borderColor: 'yellow',
    dimBorder: true,
    margin: 1,
    padding: 1,
  }
  const maxLength = getMaxHttpMethodNameLength(routeInfo)

  console.log(
    boxen(
      routeInfo
        .map(({ method, path, server, stage }) =>
          logRoute(method, server, stage, path, maxLength),
        )
        .join('\n'),
      boxenOptions,
    ),
  )
}

export function logWarning(msg: string): void {
  console.log(`offline: ${red(msg)}`)
}
