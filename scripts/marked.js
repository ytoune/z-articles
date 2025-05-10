const fs = require('fs/promises')
const path = require('path')
const { list } = require('./pages')

;(async () => {
  for (const page of list) {
    const m = page.created_at.match(/^(\d+)-(\d+)-(\d+)T/)
    if (!m) throw new Error('?created_at')
    const ts = m.slice(1).join('')
    const body = page.body
    const title = page.title
    const tags = page.tags.map(t => t.name.toLowerCase())
    const text = `---
title: ${JSON.stringify(title)}
emoji: "🔎"
type: "idea"
topics: ${JSON.stringify(tags)}
published: false
---

${body}`
    await fs.writeFile(path.resolve(__dirname, '../articles/' + ts + '__-' + page.id + '.md'), text)
  }

  // await fs.writeFile(path.resolve(__dirname, 'pages.json'), JSON.stringify(list))
})().catch(x => {
  console.error(x)
})
