import { Compile, parse } from 'velocityjs'
import runInPollutedScope from '../javaHelpers'
import debugLog from '../../../debugLog'
import { isPlainObject } from '../../../utils/index'

const { entries } = Object

function tryToParseJSON(value) {
  let parsed
  try {
    parsed = JSON.parse(value)
  } catch (err) {
    // nothing! Some things are not meant to be parsed.
  }

  return parsed || value
}

function renderVelocityString(velocityString, context) {
  // runs in a "polluted" (extended) String.prototype replacement scope
  const renderResult = runInPollutedScope(() =>
    // This line can throw, but this function does not handle errors
    // Quick args explanation:
    // { escape: false } --> otherwise would escape &, < and > chars with html (&amp;, &lt; and &gt;)
    // render(context, null, true) --> null: no custom macros; true: silent mode, just like APIG
    new Compile(parse(velocityString), { escape: false }).render(
      context,
      null,
      true,
    ),
  )

  debugLog('Velocity rendered:', renderResult || 'undefined')

  // Haaaa Velocity... this language sure loves strings a lot
  switch (renderResult) {
    case 'undefined':
      return undefined // But we don't, we want JavaScript types

    case 'null':
      return null

    case 'true':
      return true

    case 'false':
      return false

    default:
      return tryToParseJSON(renderResult)
  }
}

/*
  Deeply traverses a Serverless-style JSON (Velocity) template
  When it finds a string, assumes it's Velocity language and renders it.
*/
export default function renderVelocityTemplateObject(templateObject, context) {
  const result = {}
  let toProcess = templateObject

  // In some projects, the template object is a string, let us see if it's JSON
  if (typeof toProcess === 'string') {
    toProcess = tryToParseJSON(toProcess)
  }

  // Let's check again
  if (isPlainObject(toProcess)) {
    entries(toProcess).forEach(([key, value]) => {
      debugLog('Processing key:', key, '- value:', value)

      if (typeof value === 'string') {
        result[key] = renderVelocityString(value, context)
        // Go deeper
      } else if (isPlainObject(value)) {
        result[key] = renderVelocityTemplateObject(value, context)
        // This should never happen: value should either be a string or a plain object
      } else {
        result[key] = value
      }
    })
    // Still a string? Maybe it's some complex Velocity stuff
  } else if (typeof toProcess === 'string') {
    // If the plugin threw here then you should consider reviewing your template or posting an issue.
    const alternativeResult = tryToParseJSON(
      renderVelocityString(toProcess, context),
    )

    return isPlainObject(alternativeResult) ? alternativeResult : result
  }

  return result
}
