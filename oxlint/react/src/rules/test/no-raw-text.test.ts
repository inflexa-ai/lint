import { noRawText } from '../no-raw-text.ts'
import { createRuleTester } from './rule-tester.ts'

const text = (value: string) => ({ messageId: 'text' as const, data: { text: value, hint: '' } })
const attribute = (name: string, value: string) => ({ messageId: 'attribute' as const, data: { name, text: value, hint: '' } })

createRuleTester().run('no-raw-text', noRawText, {
  valid: [
    `<h1>{t($ => $.title)}</h1>`,
    `<Button aria-label={t($ => $.close)} />`,
    // Text without a letter reads the same in every language.
    `<p>{count} · {total}</p>`,
    `<span>—</span>`,
    `<span>{'/'}</span>`,
    `<span>42%</span>`,
    // An attribute that no person reads carries a token, not text.
    `<div className="flex gap-2" data-slot="button" role="dialog" />`,
    `<a href="/projects">{t($ => $.projects)}</a>`,
    `<input type="text" name="email" autoComplete="email" />`,
    // A computed value belongs to the code that computed it.
    `<p>{user.name}</p>`,
    `<p title={project.name}>{label}</p>`,
    `<p>{\`\${first} \${last}\`}</p>`,
    // An empty attribute has nothing to translate.
    `<img alt="" src={src} />`,
    // An attribute with no value at all is a flag.
    `<Tooltip title />`,
    // Whitespace between elements is layout.
    `<div>\n  <span />\n</div>`,
  ],
  invalid: [
    {
      code: `<h1>Page not found</h1>`,
      options: [{ hint: 'A shared namespace is in @acme/i18n.' }],
      errors: [{ messageId: 'text' as const, data: { text: 'Page not found', hint: ' A shared namespace is in @acme/i18n.' } }],
    },
    { code: `<h1>Page not found</h1>`, errors: [text('Page not found')] },
    { code: `<p>\n  Your workspace starts here.\n</p>`, errors: [text('Your workspace starts here.')] },
    // Every script, not only the English alphabet.
    { code: `<p>Seite nicht gefunden</p>`, errors: [text('Seite nicht gefunden')] },
    { code: `<p>ページが見つかりません</p>`, errors: [text('ページが見つかりません')] },
    { code: `<p>{'Try again'}</p>`, errors: [text('Try again')] },
    { code: `<p>{\`Try again\`}</p>`, errors: [text('Try again')] },
    { code: `<>Loading</>`, errors: [text('Loading')] },
    // The same English, one step further in.
    { code: `<p>{open ? 'Hide details' : 'Show details'}</p>`, errors: [text('Hide details')] },
    { code: `<p>{name ?? 'Untitled'}</p>`, errors: [text('Untitled')] },
    { code: `<p>{busy && 'Saving'}</p>`, errors: [text('Saving')] },
    { code: `<Button aria-label="Close" />`, errors: [attribute('aria-label', 'Close')] },
    { code: `<img alt="Inflexa" src={logo} />`, errors: [attribute('alt', 'Inflexa')] },
    { code: `<input placeholder="Search projects" />`, errors: [attribute('placeholder', 'Search projects')] },
    { code: `<abbr title={'Billing context'}>BC</abbr>`, errors: [attribute('title', 'Billing context'), text('BC')] },
    { code: `<div aria-description={\`Opens a dialog\`} />`, errors: [attribute('aria-description', 'Opens a dialog')] },
    { code: `<svg><title>Chart</title></svg>`, errors: [text('Chart')] },
  ],
})
