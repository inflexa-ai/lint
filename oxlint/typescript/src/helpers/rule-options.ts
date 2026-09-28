import type { Options } from '@oxlint/plugins'

type JsonValue = Options[number]

/** A JSON object of the options of a rule, keyed by option name. */
export type OptionObject = { readonly [key: string]: JsonValue | undefined }

/**
 * The first options object of a rule, or an empty one. oxlint hands a rule its
 * options as JSON, so the readers below narrow each value to the kind that the
 * rule declares, and a value of another kind gives the default.
 */
export function optionObject(options: Readonly<Options>): OptionObject {
  const first = options.at(0)
  if (first === undefined || first === null || Array.isArray(first) || typeof first === 'string' || typeof first === 'number' || typeof first === 'boolean') return {}
  return first
}

/** A string option, or the fallback. */
export function stringOption(object: OptionObject, key: string, fallback: string): string {
  const value = object[key]
  return typeof value === 'string' ? value : fallback
}

/** A string option, or `undefined` when the repository gives none. */
export function optionalStringOption(object: OptionObject, key: string): string | undefined {
  const value = object[key]
  return typeof value === 'string' ? value : undefined
}

/** An option that lists strings, or the fallback. An element that is not a string is left out. */
export function stringsOption(object: OptionObject, key: string, fallback: string[]): string[] {
  const value = object[key]
  if (!Array.isArray(value)) return fallback
  return value.filter((element) => typeof element === 'string')
}

/** An option that lists objects, each one read as an `OptionObject`. An element that is not an object is left out. */
export function objectsOption(object: OptionObject, key: string): OptionObject[] {
  const value = object[key]
  if (!Array.isArray(value)) return []
  return value.map((element) => optionObject([element])).filter((element) => Object.keys(element).length > 0)
}
