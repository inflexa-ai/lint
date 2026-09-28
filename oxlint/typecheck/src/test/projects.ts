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
      await mkdir(path.dirname(target), { recursive: true })
      await writeFile(target, text)
    }
  }
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) }
}
