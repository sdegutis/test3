import { transformSync, type PluginItem } from '@babel/core'
import { FileTree, generateFiles, Pipeline } from "immaculata"
import { readFileSync, rmSync } from "node:fs"
import { createRequire } from 'node:module'

const shims: Record<string, string> = {
  'react': 'https://esm.sh/react'
}

const isDev = process.argv[2] === 'dev'

const src = new FileTree('src', import.meta.url)

const transform = makeTransform(src, {
  jsxImport: '/test3/_jsx2.js',
  // jsxImport: 'react',
  // shims
})

transformSrcDir()

if (isDev) {
  src.watch().on('filesUpdated', transformSrcDir)
}

function transformSrcDir() {

  const files = Pipeline.from(src.files)

  files.with(/\.tsx?$/).do(file => {
    file.path = file.path.replace(/\.tsx?$/, '.js')
    file.text = transform(file.text)
  })

  rmSync('docs', { force: true, recursive: true })
  generateFiles(files.results())


}






export function makeTransform(tree: FileTree, opts?: {
  jsxImport?: string,
  shims?: Record<string, string>,
}) {
  const jsxImport = opts?.jsxImport ?? '/_jsx.js'
  const shims = opts?.shims

  const require = createRequire(import.meta.url)
  const plugins: PluginItem[] = [
    [require('@babel/plugin-transform-typescript'), { isTSX: true }],
    [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
    {
      visitor: {
        ImportDeclaration: {
          enter(path) {
            if (path.node.source.value === 'react/jsx-runtime') {
              path.node.source.value = jsxImport
            }
            modifyPath(path.node.source)
          },
        },
        ExportDeclaration: {
          enter(path) {
            if ('source' in path.node && path.node.source?.value) {
              modifyPath(path.node.source)
            }
          }
        },
      }
    }
  ]

  return function (text: string) {
    return transformSync(text, { plugins, })?.code!
  }

  function modifyPath(source: babel.types.StringLiteral) {
    const dep = source.value
    if (dep.match(/^[./]/) || dep.startsWith('http')) return

    if (shims && dep in shims) {
      source.value = shims[dep]
      return
    }

    const split = dep.indexOf('/')
    const lib = dep.slice(0, split)
    const imported = dep.slice(split)

    const pkgjson = JSON.parse(readFileSync('node_modules/' + lib + '/package.json', 'utf8'))
    const baseurl = new URL(imported, pkgjson.homepage)

    source.value = baseurl.href
  }
}
