import { transformSync } from '@babel/core'
import { DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { transformImportsPlugin } from 'immaculata/babel.js'
import { tryAltExts } from 'immaculata/hooks.js'
import { readFileSync, rmSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { join } from 'node:path'



const isDev = process.argv[2] === 'dev'



const src = new FileTree('src', import.meta.dirname)

const pkgjson = JSON.parse(readFileSync(join(import.meta.dirname, 'package.json'), 'utf8'))
const prefix = new URL(pkgjson.homepage).pathname.replace(/\/+$/, '')

if (isDev) {
  const server = new DevServer(8181, { prefix })
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
    const result = transform(file.path, file.text)!
    file.path = file.path.replace(/\.tsx?$/, '.js')

    const mapPath = file.path + '.map'
    const sourceMapPart = '\n//# sourceMappingURL=' + prefix + mapPath
    file.text = result.code! + sourceMapPart

    files.add(mapPath, JSON.stringify(result.map))
  })

  const map = files.results()

  if (server) server.files = map

  rmSync('docs', { force: true, recursive: true })
  generateFiles(map)

  return map
}

function transform(path: string, text: string) {
  return transformSync(text, {
    sourceMaps: true,
    filename: path,
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      transformImportsPlugin(import.meta.dirname),
    ],
  })
}


registerHooks(tryAltExts)

await import('./src/index.js')
