import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { TypecheckLoadError } from './errors.ts'

/** Where the virtual tsconfig adds text to the real one: the offset in the real text and the length of the added text. */
export type Insertion = { at: number; length: number }

/**
 * A project of the run: the tsconfig that a person named, and the tsconfig
 * that the command opens in its place, with the place of the text that it adds.
 */
export type ProjectFiles = { tsconfig: string; virtual: string; virtualText: string; insertion: Insertion | undefined }

const VIRTUAL_PREFIX = '.inflexa-typecheck.'

/**
 * The tsconfig of a `-p` value: the file it names, or the `tsconfig.json` of
 * the folder it names, as `tsc -p` reads it.
 */
export function resolveProject(cwd: string, project: string): string {
  const target = path.resolve(cwd, project)
  const stat = statSync(target, { throwIfNoEntry: false })
  const tsconfig = stat?.isDirectory() ? path.join(target, 'tsconfig.json') : target
  if (!statSync(tsconfig, { throwIfNoEntry: false })?.isFile()) {
    throw new TypecheckLoadError(`Cannot find the project ${project}: ${path.relative(cwd, tsconfig) || tsconfig} does not exist.`)
  }
  return tsconfig
}

/** The text of a file without the byte order mark, which TypeScript does not count in a position. */
export function withoutByteOrderMark(text: string): string {
  return text.startsWith('\uFEFF') ? text.slice(1) : text
}

/**
 * The tsconfig that the command opens for a real one: the text of the real
 * file with `"noEmit": true` as the last member of its root `compilerOptions`,
 * in the same folder, so that `extends`, `include`, `references` and each path
 * resolve as they do in the real file. `noEmit` from the command line of `tsc`
 * changes the diagnostics of the options that depend on emit, and an option
 * error of the real file keeps its place, because each offset before the
 * insertion is the offset of the real file.
 */
export function projectFiles(tsconfig: string): ProjectFiles {
  const name = path.basename(tsconfig)
  const text = withoutByteOrderMark(readFileSync(tsconfig, 'utf8'))
  const virtual = path.join(path.dirname(tsconfig), `${VIRTUAL_PREFIX}${name}`)
  const place = noEmitInsertion(text)
  if (place === undefined) return { tsconfig, virtual, virtualText: text, insertion: undefined }
  return { tsconfig, virtual, virtualText: text.slice(0, place.at) + place.text + text.slice(place.at), insertion: { at: place.at, length: place.text.length } }
}

type Token = { kind: 'open' | 'close' | 'comma' | 'colon' | 'string' | 'other'; start: number; end: number; char: string }

/** The tokens of a JSON text with comments, or `undefined` for a string or a block comment that does not end. */
function tokensOf(text: string): Token[] | undefined {
  const tokens: Token[] = []
  let index = 0
  while (index < text.length) {
    const char = text[index]
    if (' \t\r\n'.includes(char)) {
      index += 1
    } else if (char === '/' && text[index + 1] === '/') {
      const end = text.indexOf('\n', index)
      index = end === -1 ? text.length : end
    } else if (char === '/' && text[index + 1] === '*') {
      const end = text.indexOf('*/', index + 2)
      if (end === -1) return undefined
      index = end + 2
    } else if (char === '"') {
      let end = index + 1
      while (end < text.length && text[end] !== '"') end += text[end] === '\\' ? 2 : 1
      if (end >= text.length) return undefined
      tokens.push({ kind: 'string', start: index, end: end + 1, char })
      index = end + 1
    } else {
      const kind = char === '{' || char === '[' ? 'open' : char === '}' || char === ']' ? 'close' : char === ',' ? 'comma' : char === ':' ? 'colon' : 'other'
      tokens.push({ kind, start: index, end: index + 1, char })
      index += 1
    }
  }
  return tokens
}

/** The index of the token that closes the object or the array that the token at `open` opens. */
function closeOf(tokens: readonly Token[], open: number): number | undefined {
  let depth = 0
  for (let index = open; index < tokens.length; index += 1) {
    if (tokens[index].kind === 'open') depth += 1
    else if (tokens[index].kind === 'close') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return undefined
}

/** The text that a member adds before the token at `close`: a comma first, unless the object is empty or already ends with a comma. */
function memberBefore(tokens: readonly Token[], close: number, member: string): string {
  const previous = tokens[close - 1].kind
  return previous === 'open' || previous === 'comma' ? member : `,${member}`
}

/**
 * The place and the text that add `noEmit` to a tsconfig: before the closing
 * brace of the last root `compilerOptions`, or a `compilerOptions` member
 * before the closing brace of the root object when the root has none or a
 * `compilerOptions` that is not an object. The added member comes after the
 * real one, thus the error of the real value keeps its place, and the options
 * of `extends` get `noEmit` as under `tsc --noEmit`. `undefined` when the scan
 * finds no root object, or a `compilerOptions` key with no value: the program
 * then reports the errors of the real file at their places.
 */
export function noEmitInsertion(text: string): { at: number; text: string } | undefined {
  const tokens = tokensOf(text)
  if (tokens === undefined || tokens.at(0)?.char !== '{') return undefined
  const rootClose = closeOf(tokens, 0)
  if (rootClose === undefined) return undefined
  let options: number | undefined
  for (let index = 1; index < rootClose; index += 1) {
    const token = tokens[index]
    if (token.kind === 'string' && text.slice(token.start, token.end) === '"compilerOptions"' && tokens.at(index + 1)?.kind === 'colon') options = index + 2
    if (token.kind === 'open') index = closeOf(tokens, index) ?? rootClose
  }
  const rootMember = (): { at: number; text: string } => ({ at: tokens[rootClose].start, text: memberBefore(tokens, rootClose, '"compilerOptions":{"noEmit":true}') })
  if (options === undefined) return rootMember()
  // A key with no value is a parse error of the real text, and a member added at its place would take the location of that error.
  const value = tokens[options]
  if (options >= rootClose || value.kind === 'close' || value.kind === 'comma' || value.kind === 'colon') return undefined
  if (value.char !== '{') return rootMember()
  const optionsClose = closeOf(tokens, options)
  if (optionsClose === undefined) return undefined
  return { at: tokens[optionsClose].start, text: memberBefore(tokens, optionsClose, '"noEmit":true') }
}
