import { DatabaseSync } from 'node:sqlite'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const db = new DatabaseSync(join(here, '..', 'data', 'workbench.db'))

const before = {
  sessions: db.prepare('SELECT COUNT(*) AS n FROM focus_sessions').get().n,
  reviews: db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n,
  doneTasks: db.prepare('SELECT COUNT(*) AS n FROM tasks WHERE done = 1').get().n,
}
console.log('before:', before)

db.exec('BEGIN')
try {
  db.prepare('DELETE FROM focus_sessions').run()
  db.prepare('DELETE FROM reviews').run()
  db.prepare('UPDATE tasks SET done = 0, done_at = NULL, spent_seconds = 0').run()
  db.exec('COMMIT')
} catch (e) {
  db.exec('ROLLBACK')
  throw e
}

const after = {
  sessions: db.prepare('SELECT COUNT(*) AS n FROM focus_sessions').get().n,
  reviews: db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n,
  tasks: db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n,
}
console.log('after:', after)
