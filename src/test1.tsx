import { foo as foo2 } from 'api.90s.dev/test1.js'

export const foo = foo2 + 1
export const qux = <qux a={33} />

export * as bla from 'api.90s.dev/test2.js'
// export * as bla2 from './test2.js'

