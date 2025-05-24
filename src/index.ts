import { $ } from "ref.api.90s.dev/ref.js"

const r = $(0)

r.watch(n => console.log('now its', n))

r.value++
r.value++
r.value++
