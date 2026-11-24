/** 预置的算法知识地图（首次启动时写入数据库） */

export interface TopicSeed {
  track: string
  name: string
}

export const TOPIC_TRACKS = ['编程语言', '数据结构', '算法分析', '图论', '动态规划', '算法技巧'] as const

export const TOPIC_SEED: TopicSeed[] = [
  // 图论
  { track: '图论', name: '图的基础概念' },
  { track: '图论', name: '图的存储（邻接表 / 前向星）' },
  { track: '图论', name: 'DFS 与 BFS 遍历' },
  { track: '图论', name: '连通块与染色' },
  { track: '图论', name: '拓扑排序' },
  { track: '图论', name: '二分图判定' },
  { track: '图论', name: '并查集' },
  { track: '图论', name: '最小生成树（Kruskal / Prim）' },
  { track: '图论', name: 'Dijkstra 最短路' },
  { track: '图论', name: 'Bellman-Ford 与 SPFA' },
  { track: '图论', name: 'Floyd 全源最短路' },
  { track: '图论', name: '负环与差分约束' },
  { track: '图论', name: '强连通分量（Tarjan / 缩点）' },
  { track: '图论', name: '割点与桥' },
  { track: '图论', name: '二分图匹配（匈牙利）' },
  { track: '图论', name: '网络流（Dinic）' },
  { track: '图论', name: 'LCA（倍增 / 离线）' },
  { track: '图论', name: '欧拉回路' },
  { track: '图论', name: '2-SAT' },
  { track: '图论', name: '矩阵树定理' },
  // 数据结构
  { track: '数据结构', name: '栈与队列' },
  { track: '数据结构', name: '单调栈 / 单调队列' },
  { track: '数据结构', name: '堆与优先队列' },
  { track: '数据结构', name: '树状数组' },
  { track: '数据结构', name: '线段树（含懒标记）' },
  { track: '数据结构', name: 'Trie 字典树' },
  { track: '数据结构', name: '哈希表与字符串哈希' },
  { track: '数据结构', name: 'ST 表' },
  // 动态规划
  { track: '动态规划', name: '线性 DP' },
  { track: '动态规划', name: '背包问题' },
  { track: '动态规划', name: '区间 DP' },
  { track: '动态规划', name: '树形 DP' },
  { track: '动态规划', name: '状压 DP' },
  { track: '动态规划', name: '数位 DP' },
  // 算法技巧
  { track: '算法技巧', name: '二分查找' },
  { track: '算法技巧', name: '前缀和与差分' },
  { track: '算法技巧', name: '双指针' },
  { track: '算法技巧', name: '贪心' },
]

/** 番茄钟默认配置（分钟） */
export const POMODORO = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakEvery: 4,
} as const

/** 热力图着色的权重：专注秒数 / 完成任务 / 复习次数 */
export const HEATMAP_WEIGHTS = {
  focusPerHour: 1,
  perTask: 15,
  perReview: 1.5,
} as const
