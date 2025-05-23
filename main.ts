import { transformSync } from '@babel/core'
import { babel, DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { createRequire } from 'node:module'

const src = new FileTree('src', import.meta.url)

const isDev = process.argv[2] === 'dev'
if (isDev) {
  const server = new DevServer(8181, { prefix: '/test3' })
  server.files = transformSrcDir()
  src.watch().on('filesUpdated', () => {
    server.files = transformSrcDir()
  })
}
else {
  const map = transformSrcDir()
  generateFiles(map)
}

function transformSrcDir() {
  const files = Pipeline.from(src.files)

  files.with(/\.tsx?$/).do(file => {
    file.path = file.path.replace(/\.tsx?$/, '.js')
    file.text = transform(file.text)
  })

  return files.results()
}

function transform(text: string) {
  const require = createRequire(import.meta.url)
  return transformSync(text, {
    plugins: [
      [require('@babel/plugin-transform-typescript'), { isTSX: true }],
      [require('@babel/plugin-transform-react-jsx'), { runtime: 'automatic' }],
      babel.transformImportsPlugin(import.meta.dirname, {
        'react/jsx-runtime': 'https://esm.sh/react',
        // 'react/jsx-runtime': '/test3/_jsx2.js',
      })
    ],
  })!.code!
}
