import { FileTree } from "immaculata"
import { transform } from 'quickexport'

transform(new FileTree('src', import.meta.url), {
  watch: process.argv[2] === 'dev',
  jsxImport: '/_jsx2.js',
})
