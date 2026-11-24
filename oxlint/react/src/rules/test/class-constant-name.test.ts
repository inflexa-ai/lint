import { classConstantName } from '../class-constant-name.ts'
import { createRuleTester } from './rule-tester.ts'

const rename = (name: string, expected: string) => ({ messageId: 'rename' as const, data: { name, expected } })

createRuleTester().run('class-constant-name', classConstantName, {
  valid: [
    // The Tailwind rules lint these names already.
    `const RAIL_CLASSES = 'flex'\nexport const A = () => <div className={RAIL_CLASSES} />`,
    `const LOOKS_CLASSES = { sidebar: { course: 'h-10' } }\nexport const a = (look: 'sidebar') => cn('flex', LOOKS_CLASSES[look].course)`,
    `const classes = 'flex'\nexport const A = () => <div className={classes} />`,
    `const className = \`flex\`\nexport const a = cn(className)`,
    // A local constant: the plugin lints by name, and a rename of each local is noise.
    `export function A() {\n  const item = 'flex'\n  return <div className={item} />\n}`,
    // A `let` alias can change, thus the rule does not follow it.
    `const LOOKS = { a: 'h-10' }\nexport function A() {\n  let picked = LOOKS\n  return <p className={picked.a} />\n}`,
    // An alias of a module constant that already has the suffix.
    `const LOOKS_CLASSES = { a: { b: 'h-10' } }\nexport function A({ look }: { look: 'a' }) {\n  const picked = LOOKS_CLASSES[look]\n  return <p className={picked.b} />\n}`,
    // A constant outside a class position.
    `const LABEL = 'Open'\nexport const A = () => <button aria-label={LABEL} />`,
    `const LABEL = 'Open'\nexport const a = t(LABEL)`,
    // A value that is not a string, a template or an object.
    `const SIZES = ['sm', 'lg']\nexport const a = cn(SIZES)`,
    `const make = () => 'flex'\nexport const a = cn(make)`,
    // An imported constant has its declaration in another file.
    `import { ITEM } from './styles'\nexport const a = cn(ITEM)`,
    // A computed key is not the root of the member.
    `const LOOKS_CLASSES = { a: 'flex' }\nconst KEY = 'a'\nexport const a = cn(LOOKS_CLASSES[KEY])`,
  ],
  invalid: [
    { code: `const RAIL_BUTTON = 'flex'\nexport const A = () => <div className={RAIL_BUTTON} />`, errors: [rename('RAIL_BUTTON', 'RAIL_BUTTON_CLASSES')] },
    { code: `const ITEM = 'flex'\nexport const a = cn(ITEM, 'gap-2')`, errors: [rename('ITEM', 'ITEM_CLASSES')] },
    {
      code: `const LOOKS = { sidebar: { course: 'h-10' } } as const\nexport const a = (look: 'sidebar') => cn('flex', LOOKS[look].course)`,
      errors: [rename('LOOKS', 'LOOKS_CLASSES')],
    },
    // One report for each constant, at its declaration.
    { code: `const ITEM = 'flex'\nexport const A = () => <><div className={ITEM} /><div className={ITEM} /></>`, errors: [{ ...rename('ITEM', 'ITEM_CLASSES'), line: 1 }] },
    // A default name with an object value: the default selectors match strings only.
    { code: `const styles = { a: 'flex' }\nexport const a = cn(styles.a)`, errors: [rename('styles', 'STYLES_CLASSES')] },
    { code: `const railButton = \`flex\`\nexport const A = () => <div class={railButton} />`, errors: [rename('railButton', 'RAIL_BUTTON_CLASSES')] },
    { code: `const BASE = 'flex' satisfies string\nexport const a = cva(BASE, { variants: {} })`, errors: [rename('BASE', 'BASE_CLASSES')] },
    // The rule follows the value through a conditional, a logical expression, a template, an array, a spread and an optional chain.
    {
      code: `const ON = 'a'\nconst OFF = 'b'\nconst EXTRA = 'c'\nconst WIDE = 'd'\nconst MORE = ['e']\nconst MAP = { x: 'f' }\nexport const A = (on: boolean) => <div className={cn(on ? ON : OFF, on && EXTRA, \`\${WIDE} g\`, [...MORE], MAP?.x)} />`,
      errors: [rename('ON', 'ON_CLASSES'), rename('OFF', 'OFF_CLASSES'), rename('EXTRA', 'EXTRA_CLASSES'), rename('WIDE', 'WIDE_CLASSES'), rename('MAP', 'MAP_CLASSES')],
    },
    // A local `const` is an alias: the rule follows its value to the module constant.
    {
      code: `const LOOKS = { a: { b: 'h-10' } }\nexport function A({ look }: { look: 'a' }) {\n  const picked = LOOKS[look]\n  return <p className={cn(picked.b)} />\n}`,
      errors: [{ ...rename('LOOKS', 'LOOKS_CLASSES'), line: 1 }],
    },
    {
      code: `const SIZES = { sm: { control: 'h-8' } }\nexport function A({ size }: { size: 'sm' }) {\n  const { control } = SIZES[size]\n  return <p className={control} />\n}`,
      errors: [rename('SIZES', 'SIZES_CLASSES')],
    },
    {
      code: `const ITEM = 'flex'\nexport function A({ on }: { on: boolean }) {\n  const base = ITEM\n  const current = on ? base : ''\n  return <p className={current} />\n}`,
      errors: [rename('ITEM', 'ITEM_CLASSES')],
    },
  ],
})
