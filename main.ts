import { transformSync, type PluginItem } from '@babel/core'
import { FileTree, generateFiles, Pipeline } from "immaculata"
import { readFileSync, rmSync } from "node:fs"
import { createRequire } from 'node:module'

transform(new FileTree('src', import.meta.url), {
  watch: process.argv[2] === 'dev',
})

function transform(tree: FileTree, opts?: { watch?: boolean, jsxImport?: string }) {
  const watch = opts?.watch
  const jsxImport = opts?.jsxImport ?? '/_jsx.js'

  function modifyPath(dep: string, source: babel.types.StringLiteral) {
    if (!dep || dep.match(/^[./]/)) return

    const split = dep.indexOf('/')
    const lib = dep.slice(0, split)
    const imported = dep.slice(split)

    const pkgjson = JSON.parse(readFileSync('node_modules/' + lib + '/package.json', 'utf8'))
    const baseurl = new URL(imported, pkgjson.homepage)

    source.value = baseurl.href
  }

  const require = createRequire(import.meta.url)
  const plugins: PluginItem[] = [
    [require('@babel/plugin-transform-typescript'), { isTSX: true }],
    [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
    {
      visitor: {
        ImportDeclaration: {
          enter: (path) => {
            const dep = path.node.source?.value
            if (dep === 'react/jsx-runtime') {
              path.node.source.value = jsxImport
              return
            }

            modifyPath(dep, path.node.source)
          },
        },
        ExportDeclaration: {
          enter(path) {
            if (!('source' in path.node)) return

            const dep = path.node.source?.value
            if (!dep || dep.match(/^[./]/)) return

            modifyPath(dep, path.node.source!)
          }
        },
      }
    }
  ]

  transformAll()
  if (watch) tree.watch().on('filesUpdated', transformAll)

  function transformAll() {
    const files = Pipeline.from(tree.files)

    files.with(/\.tsx?$/).do(file => {
      file.path = file.path.replace(/\.tsx?$/, '.js')
      file.text = transformSync(file.text, { plugins, })?.code!
    })

    rmSync('docs', { force: true, recursive: true })
    generateFiles(files.results())
  }
}
