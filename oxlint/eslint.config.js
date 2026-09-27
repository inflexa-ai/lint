import { typescript } from '@inflexa-ai/oxlint-plugin/eslint'

// ESLint reads no .gitignore, thus the staged packages of a release need their own ignore.
export default typescript({ tsconfigRootDir: import.meta.dirname, ignores: ['.release/**'] })
