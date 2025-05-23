import { transformSync } from '@babel/core'
import { FileTree, generateFiles, Pipeline } from "immaculata"
import { rmSync } from "node:fs"
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

const tree = new FileTree('src', import.meta.url)

transformAll()
tree.watch().on('filesUpdated', transformAll)

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
