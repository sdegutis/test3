import { transformSync } from '@babel/core'
import { DevServer, FileTree, generateFiles, Pipeline } from "immaculata"
import { transformImportsPlugin } from 'immaculata/babel.js'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

publishDir({
  projectRoot: import.meta.dirname,
  srcDir: 'src',
  dev: process.argv[2] === 'dev' && {
    port: 8181,
    generateFiles: true,
  },
  importMap: {
    'react': 'https://esm.sh/react',
    'react-dom': 'https://esm.sh/react-dom',
  }
})

function publishDir(opts: {
  dev?: {
    port: number,
    generateFiles: boolean,
  } | false,
  projectRoot: string,
  srcDir: string,
  importMap: Record<string, string>
}) {

  const src = new FileTree(opts.srcDir, opts.projectRoot)

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
