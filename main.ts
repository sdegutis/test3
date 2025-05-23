import { transformSync } from '@babel/core'
import { babel, DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { rmSync } from 'node:fs'

const src = new FileTree('src', import.meta.url)

const isDev = process.argv[2] === 'dev'
if (isDev) {
  const server = new DevServer(8181, { prefix: '/test3' })
  transformSrcDir(server)
  src.watch().on('filesUpdated', () => {
    transformSrcDir(server)
  })
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

function transform(text: string) {
  return transformSync(text, {
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      babel.transformImportsPlugin(import.meta.dirname, {
        'react/jsx-runtime': 'https://esm.sh/react',
        // 'react/jsx-runtime': '/test3/_jsx2.js',
      })
    ],
  })!.code!
}
