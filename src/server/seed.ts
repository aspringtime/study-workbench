/**
 * 演示数据。用法：
 *   pnpm seed            # 往当前数据库灌一批示例（数据库里有任务时会拒绝）
 *   pnpm seed --force    # 清空演示相关的表再灌
 *
 * 想灌到一个临时库上看效果：
 *   设置 DATA_DIR 指向别的目录再跑。
 */
import { db, now, seedTopicsIfEmpty, uid } from './db'
import { addDays, todayStr } from '../shared/dates'

const force = process.argv.includes('--force')

function dayAt(date: string, hour: number, minute = 0): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d, hour, minute, 0)
}

const existing = (db.prepare('SELECT COUNT(*) AS n FROM tasks').get() as { n: number }).n
if (existing > 0 && !force) {
  console.log(`数据库里已经有 ${existing} 条任务了。想重灌演示数据，用 pnpm seed --force`)
  process.exit(0)
}

if (force) {
  db.exec('DELETE FROM reviews; DELETE FROM cards; DELETE FROM notes; DELETE FROM focus_sessions; DELETE FROM tasks; DELETE FROM topics;')
}

const today = todayStr()
const yesterday = addDays(today, -1)
const ts = now()

/* ---------- 知识点状态 ---------- */

const setTopicStatus = (nameLike: string, status: string, practice = 0) => {
  db.prepare(
    `UPDATE topics SET status = ?, practice = ?, updated_at = ?
     WHERE name LIKE ?`,
  ).run(status, practice, ts, `%${nameLike}%`)
}

seedTopicsIfEmpty()
setTopicStatus('图的基础', 'done', 3)
setTopicStatus('图的存储', 'done', 5)
setTopicStatus('DFS 与 BFS', 'done', 8)
setTopicStatus('连通块', 'done', 4)
setTopicStatus('拓扑排序', 'done', 6)
setTopicStatus('二分图判定', 'learning', 2)
setTopicStatus('并查集', 'learning', 3)
setTopicStatus('最小生成树', 'learning', 1)
setTopicStatus('Dijkstra', 'learning', 2)

/* ---------- 任务 ---------- */

const insertTask = db.prepare(
  `INSERT INTO tasks (id, title, note, date, priority, done, created_at, done_at, estimate_pomodoros, spent_seconds)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
)

const tasks: [string, string, string, 0 | 1, number, number][] = [
  ['把 Dijkstra 的堆优化模板手写一遍，不看笔记', today, 'high', 0, 2, 1500],
  ['刷 2 道最短路，写完自己对拍', today, 'normal', 0, 2, 0],
  ['四级听力：精听一套，把错的句子逐句听写', today, 'high', 0, 1, 0],
  ['整理这周图论的错题', today, 'low', 0, 1, 0],
  ['买泡面', today, 'low', 1, 0, 0],
  ['看 Tarjan 求强连通分量', yesterday, 'normal', 1, 2, 3000],
  ['背 30 个单词', yesterday, 'low', 1, 0, 0],
]

tasks.forEach(([title, date, priority, done, est, spent], i) => {
  const created = dayAt(date!, 8, i * 3).toISOString()
  const doneAt = done ? dayAt(date!, 21, 10 + i).toISOString() : null
  insertTask.run(uid(), title, '', date, priority, done, created, doneAt, est, spent)
})

/* ---------- 专注记录 ---------- */

const insertSession = db.prepare(
  `INSERT INTO focus_sessions (id, task_id, date, started_at, ended_at, seconds, kind, label)
   VALUES (?, NULL, ?, ?, ?, ?, 'focus', ?)`,
)

const labels = ['Dijkstra 模板', '最短路刷题', '四级听力精听', '错题整理', 'Tarjan', '看视频', '补昨天的进度']
let seed = 20261125
const rnd = () => {
  seed = (seed * 1103515245 + 12345) % 2147483648
  return seed / 2147483648
}

for (let d = 26; d >= 1; d--) {
  const date = addDays(today, -d)
  const roll = rnd()
  if (roll < 0.18) continue // 有些天没学
  const count = d > 14 ? Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3)
  for (let i = 0; i < count; i++) {
    const hour = 15 + Math.floor(rnd() * 6)
    const minute = Math.floor(rnd() * 50)
    const start = dayAt(date, hour, minute)
    const minutes = 25
    const end = new Date(start.getTime() + minutes * 60_000)
    insertSession.run(
      uid(),
      date,
      start.toISOString(),
      end.toISOString(),
      minutes * 60,
      labels[Math.floor(rnd() * labels.length)],
    )
  }
}

// 今天再来两段
for (const [h, m, label] of [
  [9, 10, 'Dijkstra 模板'],
  [10, 30, '四级听力精听'],
] as const) {
  const start = dayAt(today, h, m)
  const end = new Date(start.getTime() + 25 * 60_000)
  insertSession.run(uid(), today, start.toISOString(), end.toISOString(), 25 * 60, label)
}

/* ---------- 笔记 ---------- */

const insertNote = db.prepare(
  `INSERT INTO notes (id, title, kind, content, tags, topic_id, pinned, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
)

const notes: [string, string, string, string[], 0 | 1][] = [
  [
    'Dijkstra 堆优化模板',
    'template',
    `## 要点
- 边权非负才成立
- \`dist\` 初始化 INF，起点 0
- 出堆时判断 \`if (d != dist[u]) continue;\`

\`\`\`cpp
typedef pair<int,int> PII;
vector<int> dijkstra(int s, vector<vector<PII>>& g) {
    int n = g.size();
    vector<int> dist(n, INT_MAX);
    priority_queue<PII, vector<PII>, greater<PII>> pq;
    dist[s] = 0;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d != dist[u]) continue;
        for (auto [v, w] : g[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
\`\`\`

时间复杂度 \`O((n+m) log n)\`。`,
    ['图论', '最短路'],
    1,
  ],
  [
    '链式前向星写法',
    'template',
    `\`\`\`cpp
int head[N], nxt[M], to[M], w[M], tot = 0;
void add(int u, int v, int c) {
    to[++tot] = v; w[tot] = c; nxt[tot] = head[u]; head[u] = tot;
}
for (int i = head[u]; i; i = nxt[i]) { int v = to[i]; }
\`\`\`
记住 \`head\` 要初始化为 0，\`tot\` 从 1 开始，这样 0 可以当空指针。`,
    ['图论', '存图'],
    0,
  ],
  [
    'DFS 忘记标记访问的坑',
    'pitfall',
    `在网格里搜连通块，写了递归但忘了 \`vis[x][y] = 1\`，结果栈溢出。

正确顺序：进入函数第一件事就是标记，不是遍历邻居的时候才标记。否则同一个点会被反复入栈。

还有一点：\`vis\` 的清理时机要分清 —— 求连通块不清理，搜索所有路径要清理。`,
    ['图论', 'DFS'],
    0,
  ],
  [
    '把听力做成逐句精听的小工具',
    'idea',
    `每次对答案都要手动拖进度条，太蠢了。

想要一个东西：上传音频和字幕，点一句播一句，自动循环三遍，错的句子打标记，最后生成一份错句清单。

其实用 Web Audio + 时间戳就能做，不一定要后端。`,
    ['想法', '四级'],
    0,
  ],
]

notes.forEach(([title, kind, content, tags, pinned]) => {
  insertNote.run(uid(), title, kind, content, JSON.stringify(tags), pinned, ts, ts)
})

/* ---------- 卡片 ---------- */

const insertCard = db.prepare(
  `INSERT INTO cards (id, deck, front, back, ease, interval_days, reps, lapses, due_date, created_at, last_reviewed_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
)

const cards: [string, string, string, number, number][] = [
  ['图论', 'Dijkstra 不能处理什么边？为什么？', '负权边。贪心每次取当前最近的点，负边会让已经确定的点还有更短路径。需要 Bellman-Ford / SPFA。', 2.5, 0],
  ['图论', '拓扑排序的两种写法', '① Kahn：不断取入度为 0 的点；② DFS：按结束时间逆序。Kahn 还能顺便判环（队列不满 n 个点即有环）。', 2.5, 0],
  ['图论', '并查集的两个优化', '路径压缩 + 按秩/按大小合并，两者一起用接近 O(α(n))。', 2.6, 1],
  ['图论', '强连通分量缩点之后得到什么图？', '有向无环图（DAG）。缩点后可以跑拓扑 DP。', 2.4, 0],
  ['图论', '二分图判定的染色规则', 'BFS/DFS 交替染 1 和 -1，遇到相邻同色就不是二分图。', 2.5, 0],
  ['四级', 'resilient', '有韧性的；能快速恢复的。a resilient economy', 2.3, 1],
  ['四级', 'ambiguous', '模棱两可的、含糊不清的。His answer was deliberately ambiguous.', 2.5, 0],
  ['四级', 'undermine', '逐渐削弱、暗中破坏。Constant criticism undermines confidence.', 2.7, 3],
]

cards.forEach(([deck, front, back, ease, interval]) => {
  insertCard.run(uid(), deck, front, back, ease, interval, interval > 0 ? 3 : 0, 0, today, ts, null)
})

console.log('演示数据已写入')
console.log(' 任务', tasks.length, '条')
console.log(' 卡片', cards.length, '张')
console.log(' 笔记', notes.length, '篇')
