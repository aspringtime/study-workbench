# 词库

`cet4.json` / `cet6.json` 不是手写的，由 `scripts/build-words.mjs` 从开源词表生成。

- 数据来源：https://github.com/KyleBing/english-vocabulary
- 许可证：BSD 3-Clause
- Copyright (c) 2022-2026, KyleBing

原始数据是每行 `word\t词性 + 中文释义` 的纯文本，脚本解析后去重、压成
`[["word", "n. 释义"], ...]` 的紧凑格式。

重新生成（两个参数分别指向四、六级原始 txt）：

```bash
node scripts/build-words.mjs ../tools/3四级-乱序.txt ../tools/4六级-乱序.txt
```

统计：四级 4543 词，六级 3991 词（去重后）。
