import { foo as foo2 } from 'api.90s.dev/test1.js'
// import React from 'react'
import React from 'react'
import { createRoot } from 'react-dom/client'

export const foo = foo2 + 1

function Foo() {
  const [clicks, setClicks] = React.useState(0)

  return <div>
    <p>Hello, world...</p>
    <p>{clicks}</p>
    <p><button onClick={() => setClicks(c => c + 1)}>Click</button></p>
  </div>
}

document.body.innerHTML = '<div id="app"></div>'
const root = createRoot(document.getElementById('app')!)
root.render(<Foo />)

// export * as bla from 'api.90s.dev/test2.js'
// export * as bla2 from './test2.js'

