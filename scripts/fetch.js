const fs = require('fs/promises')
const path = require('path')

;(async () => {
  const list = []
  for (let page = 1; ; ++page) {
    const json = await fetch(
      'https://qiita.com/api/v2/users/rithmety/items?page=' + page,
    ).then(r => r.json())
    if (!(json && json.length)) break
    json.map(s => list.push(s))
  }
  await fs.writeFile(
    path.resolve(__dirname, 'pages.js'),
    'module.exports = ' + JSON.stringify({ list }),
  )
})().catch(x => {
  console.error(x)
})
