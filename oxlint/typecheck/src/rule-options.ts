import type { RuleOptions } from './rule.ts'

/**
 * The option check of a rule whose options are lists of strings: each element
 * of each array option must be a string. The configuration already refuses a
 * key that the defaults do not have and a value of another kind.
 */
export function stringArraysOnly(options: RuleOptions): string | undefined {
  for (const [key, value] of Object.entries(options)) {
    if (Array.isArray(value) && value.some((element) => typeof element !== 'string')) return `each element of the option ${key} must be a string.`
  }
  return undefined
}
