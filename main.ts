import { transformSync } from '@babel/core'
import { FileTree, generateFiles, Pipeline } from "immaculata"
import { readFileSync, rmSync } from "node:fs"
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const tree = new FileTree('src', import.meta.url)

transformAll()

const isDev = process.argv[2] === 'dev'
if (isDev) tree.watch().on('filesUpdated', transformAll)

function transformAll() {
  const files = Pipeline.from(tree.files)

  files.with(/\.tsx?$/).do(file => {
    file.path = file.path.replace(/\.tsx?$/, '.js')
    file.text = transformSync(file.text, {
      plugins: [
        [require('@babel/plugin-transform-typescript'), { isTSX: true }],
        [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
        {
          visitor: {
            ImportDeclaration: {
              enter: (path) => {
                const dep = path.node.source?.value
                if (!dep) return

                if (dep === 'react/jsx-runtime') {
                  path.node.source.value = '/_jsx.js'
                }
                else if (!dep.match(/^[./]/)) {
                  const split = dep.indexOf('/')
                  const lib = dep.slice(0, split)
                  const imported = dep.slice(split)

                  const pkgjson = JSON.parse(readFileSync('node_modules/' + lib + '/package.json', 'utf8'))
                  const baseurl = new URL(imported, pkgjson.homepage)
                  path.node.source.value = baseurl.href
                }
              },
            }
          }
        }
      ],
    })?.code!
  })

  rmSync('docs', { force: true, recursive: true })
  generateFiles(files.results())
}
