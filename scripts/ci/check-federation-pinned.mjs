// CI check: @draggonnb/federation-shared MUST be pinned exact, never with ^.
// See .planning/phases/13-cross-product-foundation/13-RESEARCH.md Pitfall 5
import { readFileSync } from 'fs'
const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))
const fed = pkg.dependencies?.['@draggonnb/federation-shared']
if (!fed) {
  console.error('ERROR: @draggonnb/federation-shared not in dependencies')
  process.exit(1)
}
if (fed.startsWith('^') || fed.startsWith('~') || fed.startsWith('>=')) {
  console.error(`ERROR: @draggonnb/federation-shared must be exact version, got "${fed}"`)
  console.error('See .planning/phases/13-cross-product-foundation/13-RESEARCH.md Pitfall 5')
  process.exit(1)
}
console.log(`OK: @draggonnb/federation-shared pinned at exact ${fed}`)
