import { transformSync } from '@babel/core'
import { DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { transformImportsPlugin } from 'immaculata/babel.js'
import { rmSync } from 'node:fs'

const src = new FileTree('src', import.meta.url)

const isDev = process.argv[2] === 'dev'
if (isDev) {
  const server = new DevServer(8181, { prefix: '/test3' })
  processSite(server)
  src.watch().on('filesUpdated', () => {
    processSite(server)
  })
}
else {
  processSite()
}

function processSite(server?: DevServer) {
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
      transformImportsPlugin(import.meta.dirname, {
        // 'react/jsx-runtime': 'https://esm.sh/react/jsx-runtime.mjs',
        'react': 'https://esm.sh/react',
        'react-dom': 'https://esm.sh/react-dom',
        // 'react/jsx-runtime': '/test3/_jsx2.js',
      }),
    ],
  })!.code!
}
