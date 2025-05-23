export const foo = 123
export const qux = <qux />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: { a?: number }
    }
  }
}
