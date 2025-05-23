import { transformSync, type PluginItem } from '@babel/core'
import { DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { readFileSync, rmSync } from "node:fs"
import { createRequire } from 'node:module'

const isDev = process.argv[2] === 'dev'

const src = new FileTree('src', import.meta.url)

const transform = makeTransform({
  // 'react/jsx-runtime': 'https://esm.sh/react',
  'react/jsx-runtime': '/test3/_jsx2.js',
})

if (isDev) {
  const server = new DevServer(8181, {
    onRequest(res) {
      res.req.url = res.req.url!.slice('/test3'.length)
    },
  })
  transformSrcDir(server)
  src.watch().on('filesUpdated', () => transformSrcDir(server))
}
else {
  transformSrcDir()
}

function transformSrcDir(server?: DevServer) {
  const files = Pipeline.from(src.files)

  files.with(/\.tsx?$/).do(file => {
    file.path = file.path.replace(/\.tsx?$/, '.js')
    file.text = transform(file.text)
  })

  const map = files.results()
  if (server) server.files = map
  rmSync('docs', { force: true, recursive: true })
  generateFiles(map)
  return map
}






export function makeTransform(replacements?: Record<string, string>) {
  const require = createRequire(import.meta.url)
  const plugins: PluginItem[] = [
    [require('@babel/plugin-transform-typescript'), { isTSX: true }],
    [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
    {
      visitor: {
        ImportDeclaration: {
          enter(path) {
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

  return (text: string) => transformSync(text, {
    plugins,
  })!.code!

  function modifyPath(source: babel.types.StringLiteral) {
    const dep = source.value
    if (dep.match(/^[./]/) || dep.startsWith('http')) return

    if (replacements && dep in replacements) {
      source.value = replacements[dep]
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
