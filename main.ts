import { transformSync } from '@babel/core'
import { DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { transformImportsPlugin } from 'immaculata/babel.js'
import { tryAltExts, useTree } from 'immaculata/hooks.js'
import { registerHooks } from 'module'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

publishDir({
  projectRoot: import.meta.dirname,
  srcDir: 'src',
  dev: process.argv[2] === 'dev' && {
    port: 8181,
    generateFiles: true,
  },
  importMap: {}
})

export function publishDir(opts: {
  dev?: {
    port: number,
    generateFiles: boolean,
  } | false,
  projectRoot: string,
  srcDir: string,
  importMap: Record<string, string>
}) {

  const src = new FileTree(opts.srcDir, opts.projectRoot)

  registerHooks(useTree(src))

  const pkgjson = JSON.parse(readFileSync(join(opts.projectRoot, 'package.json'), 'utf8'))
  const prefix = new URL(pkgjson.homepage).pathname.replace(/\/+$/, '')

  if (opts.dev) {
    const server = new DevServer(opts.dev.port, { prefix })
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

    if (!opts.dev || opts.dev.generateFiles) {
      rmSync('docs', { force: true, recursive: true })
      generateFiles(map)
    }

    return map
  }

  function transform(path: string, text: string) {
    return transformSync(text, {
      sourceMaps: true,
      filename: path,
      plugins: [
        ['@babel/plugin-transform-typescript', { isTSX: true }],
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        transformImportsPlugin(opts.projectRoot, opts.importMap),
      ],
    })
  }

}

// registerHooks(compileJsx((src, url) => {
//   return transform(url, src)?.code!
// }))
registerHooks(tryAltExts)

registerHooks({
  load(url, context, nextLoad) {

    if (url.includes('/node_modules/') && url.match(/\.tsx?$/)) {
      const src = readFileSync(fileURLToPath(url), 'utf8')
      const code = transform(url, src)!.code!
      return {
        format: 'module',
        shortCircuit: true,
        source: code,
      }
    }

    console.log('loadnig', url)
    return nextLoad(url, context)
  },
})

await import('./src/index.js')

function transform(path: string, text: string) {
  return transformSync(text, {
    sourceMaps: true,
    filename: path,
    plugins: [
      ['@babel/plugin-transform-typescript', { isTSX: true }],
      ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    ],
  })
}
