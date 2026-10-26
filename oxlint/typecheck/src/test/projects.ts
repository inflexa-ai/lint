import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

/**
 * Writes each project, a map from a relative path to the text of the file,
 * into its own folder of a new temporary folder. The root is the real path,
 * because tsc prints the paths relative to the real working folder, and the
 * temporary folder of macOS sits behind a symbolic link.
 */
export async function writeProjects(projects: Record<string, Record<string, string>>): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), 'inflexa-typecheck-')))
  for (const [name, files] of Object.entries(projects)) {
    for (const [file, text] of Object.entries(files)) {
      const target = path.join(root, name, file)
      // oxlint-disable-next-line no-await-in-loop -- a file goes into the folder that the line before it makes
      await mkdir(path.dirname(target), { recursive: true })
      // oxlint-disable-next-line no-await-in-loop -- the fixtures of a test are few, and one at a time keeps a failure on one path
      await writeFile(target, text)
    }
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) }
}
