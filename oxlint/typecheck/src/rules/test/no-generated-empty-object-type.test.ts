import { noGeneratedEmptyObjectType } from '../no-generated-empty-object-type.ts'
import { createRuleTester } from './rule-tester.ts'

// The cases of the upstream test of typescript-eslint. The tester of this
// package compares the start of a report and not its end.
createRuleTester().run('no-generated-empty-object-type', noGeneratedEmptyObjectType, {
  valid: [
    `
type Data = { name: string; num: number };
type Expected = Omit<Data, 'name'>;
    `,
    `
type Data = { name: string; num: number };
declare function doSomething<T extends Omit<Data, 'name'>>(param: T): void;
    `,
    `
type Names = Array<string>;
    `,
    `
type Empty = {};
    `,
    `
type Explicit = {} | { value: number };
    `,
    `
interface Empty {}
type Alias = Empty;
    `,
    `
class Empty {}
type Alias = Empty;
    `,
    `
type Dictionary = Record<string, never>;
    `,
    `
type Callable = () => void;
type Aliased = Exclude<Callable, undefined>;
    `,
    `
type Data = { name: string; num: number };
type NullableData = null | Data;
type Intersected = Omit<NullableData, 'name'> & { other: string };
    `,
    `
type Data = { name: string; value: number };
type Data2 = { name: string };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type Expected = DistributiveOmit<Data | Data2, 'name'> & {
  other: string;
};
    `,
    `
declare function getEnumNames<T extends string>(
  myEnum: Record<T, unknown>,
): T[];
    `,
    `
type MakeRequired<Base, Key extends keyof Base> = Omit<Base, Key> &
  Required<Record<Key, NonNullable<Base[Key]>>>;
    `,
    `
type Emptied<T> = Omit<T, keyof T>;
    `,
    `
type Keys<T> = T extends infer U ? keyof U : never;
type Mapped<T extends object> = { [Key in Keys<T>]: Key };
type Referenced<T extends object> = Mapped<T>;
    `,
    `
type Keys<T> = T extends infer U ? keyof U : never;
type Mapped<T extends object> = { [Key in Keys<T>]: Key };
type Indexed<T extends object> = Mapped<T>[Keys<T>];
    `,
    `
type Keys<T> = T extends infer U ? keyof U : never;
type Remapped<T extends object> = {
  [Key in Keys<T> as \`get\${string & Key}\`]: () => void;
};
type Referenced<T extends object> = Remapped<T>;
    `,
    `
type Keys<T> = T extends infer U ? keyof U : never;
type ReadonlyMapped<T extends object> = { readonly [Key in Keys<T>]: number };
type Referenced<T extends object> = ReadonlyMapped<T>;
    `,
    // A parenthesized member of an intersection: ESTree has no parenthesized type, thus upstream sees the intersection as the parent.
    `
type Data = { name: string };
type Wrapped = (Omit<Data, 'name'>) & { other: string };
    `,
  ],
  invalid: [
    {
      code: `
type Data = { name: string; num: number };
type NullableData = null | Data;
type Unexpected = Omit<NullableData, 'name'>;
      `,
      errors: [
        {
          column: 19,
          line: 4,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; num: number };
type NullableData = null | Data;
function doSomething<T extends Omit<NullableData, 'name'>>(param: T) {}
      `,
      errors: [
        {
          column: 32,
          line: 4,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; num: number };
type Unexpected = Pick<Data, never>;
      `,
      errors: [
        {
          column: 19,
          line: 3,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Unexpected = NonNullable<unknown>;
      `,
      errors: [
        {
          column: 19,
          line: 2,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; num: number };
type NullableData = null | Data;
declare const unexpected: Omit<NullableData, 'name'>;
      `,
      errors: [
        {
          column: 27,
          line: 4,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; num: number };
type NullableData = null | Data;
type Unexpected = Omit<NullableData, 'name'>;
type Referencing = Unexpected;
      `,
      errors: [
        {
          column: 19,
          line: 4,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; num: number };
type NullableData = null | Data;
type Unexpected = Array<Omit<NullableData, 'name'>>;
      `,
      errors: [
        {
          column: 25,
          line: 4,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { name: string; value: number };
type Data2 = { name: string };
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never;
type Unexpected = DistributiveOmit<Data | Data2, 'name'>;
      `,
      errors: [
        {
          column: 19,
          line: 7,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
    {
      code: `
type Data = { a: string };
type Unexpected = Omit<Data, 'a'> & Omit<Data, 'a'>;
      `,
      errors: [
        {
          column: 19,
          line: 3,
          messageId: 'noGeneratedEmptyObjectType',
        },
      ],
    },
  ],
})
