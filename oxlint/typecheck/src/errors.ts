/**
 * An input of the run that cannot load: a project, the configuration, a plugin
 * or the options of a rule. The command prints the message and exits with 1.
 */
export class TypecheckLoadError extends Error {
  override name = 'TypecheckLoadError'
}
