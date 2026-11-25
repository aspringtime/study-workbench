# 词库

`words.json` 不是手写的，由 `scripts/build-words.mjs` 从两份开源数据合成。

- 词表：https://github.com/KyleBing/english-vocabulary
  - 许可证 BSD 3-Clause，Copyright (c) 2022-2026, KyleBing
- 词频：https://github.com/mahavivo/english-wordlists 的 `COCA_20000.txt`
  - 该文件是一行一个词、按使用频率从高到低排列，所以**行号就是排名**

格式是 `[单词, 释义, 级别, 频档]` 的四元组：

| 字段 | 含义 |
| --- | --- |
| 级别 | `CET4` / `CET6` / `CET4/6`（两套词表都有） |
| 频档 | `0` 高频（COCA 前 2000） · `1` 中频（2000–5000） · `2` 低频或不收录 |

重新生成：

```bash
node scripts/build-words.mjs <四级.txt> <六级.txt> <COCA_20000.txt>
```

当前统计：

```
总词数 6661
高频 1454 · 中频 2055 · 低频 3152
四级独有 2670 · 六级独有 2118 · 两套共有 1873
```
