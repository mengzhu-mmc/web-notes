# 性能 CI 卡口与性能预算

> 优化是一次性的，退化是持续的。没有自动化卡口的性能优化，半年后一定回到原点

## 面试高频考点

- 你把首屏从 3.8s 优化到 1.5s 之后，怎么保证半年后它不会退化回去？
- 性能预算（Performance Budget）有哪几类？哪一类适合做 CI 硬卡口，哪一类不适合？
- CI runner 上跑出来的 LCP 两次差 30%，你会把它设成 error 还是 warn？为什么？
- `size-limit` 和 Lighthouse CI 分别解决什么问题？为什么体积卡口要放在前面？
- Lighthouse 分数达标了，为什么线上真实用户的 Core Web Vitals 还是不达标？

---

## 一、为什么需要性能预算

### 1.1 性能腐化（Performance Decay）现象

一个真实且普遍的故事：

团队花两周做了首屏专项，LCP 从 3.8s 打到 1.5s，写了复盘文档，拿了季度优秀案例。半年后有人抱怨页面变慢，重新跑一遍 Lighthouse——LCP 3.8s，回到了起点。中间没有任何一次「性能事故」，也没有任何一个人干了坏事。

这就是**性能腐化**：性能指标在没有任何单点错误的情况下，随迭代自然回落。

```
LCP (s)
4.0 ┤●                                                  ┌──●
    │ ╲                                            ┌────┘
3.5 ┤  ╲                                      ┌────┘
    │   ╲                                ┌────┘
3.0 ┤    ╲                          ┌────┘
    │     ╲                    ┌────┘
2.5 ┤      ╲              ┌────┘
    │       ╲        ┌────┘
2.0 ┤        ╲  ┌────┘
    │         ╲┌┘
1.5 ┤          ●──┘
    │        专项优化结束
1.0 ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──▶
     第1周      第4周       第10周      第16周      第26周
    └─ 集中优化 ─┘└──────── 日常业务迭代 ────────────────┘

每个 PR 的增量：+8KB、+12ms、+1 个请求 …… 单看都「只加了一点点」
26 周 × 若干 PR 累积  ⇒  完全吃掉两周的优化成果
```

### 1.2 关键洞察：退化是累积的，不是单点的

这是整篇笔记的立论基础，也是面试时最能体现判断力的一句话：

| | 单点退化 | 累积退化 |
| --- | --- | --- |
| **表现** | 某个 PR 让首屏从 1.5s 变成 4s | 每个 PR 让首屏慢 20ms |
| **能否被 code review 发现** | 能，非常明显 | 不能 |
| **review 时的合理性** | 会被质疑「这改动怎么这么重」 | 「就引了个日期格式化库」，无法反对 |
| **需要的手段** | 人工评审足够 | 必须自动化累加与卡口 |
| **占实际退化的比例** | 少数 | **绝大多数** |

为什么人工评审必然失效：

1. **无反对理由**：`+8KB` 这个数字在 PR 里根本不可见，即便可见，「引一个成熟库比自己写安全」也是正确的技术判断。评审者没有立场否决。
2. **无累加视角**：评审者只看这一次 diff，看不到「本季度总量已经从 240KB 涨到 310KB」。
3. **无量化基线**：没人记得三个月前的 LCP 是多少，凭感觉「好像差不多」。
4. **责任分散**：最后一个把包体积推过临界点的 PR 作者，不是造成问题的人，凭什么让他改。

结论：**性能必须像类型检查、Lint 一样，变成机器执行的、有明确数字的、不可协商的门禁**。人只负责设定预算和处理例外，不负责逐次判断。

> 💡 一句话面试版：性能退化是累积的而非单点的，累积退化天然无法被 code review 拦住，所以唯一有效的手段是把预算写成 CI 断言，让机器每次都算总量。

### 1.3 性能预算的定义

**性能预算（Performance Budget）**：为一组可量化的性能指标预先设定的上限值，超出即视为质量问题，由自动化流程拦截或告警。

它和「性能优化目标」的区别：

| | 优化目标 | 性能预算 |
| --- | --- | --- |
| **时态** | 未来要达到 | 当下不许突破 |
| **形式** | 文档里的一句话 | 配置文件里的一个数字 |
| **执行者** | 人，靠自觉 | CI，靠断言 |
| **失效方式** | 项目结束就没人提了 | 只有显式改配置才能放宽 |

---

## 二、性能预算的三种类型

Google 的分类法把预算分成三类，选型时先想清楚自己在设哪一类。

### 2.1 数量型（Quantity-based）

对资源的「数量」设限，构建产物一出来就能算出，不需要跑浏览器。

- JS 总体积（gzip / brotli 后）
- CSS 总体积
- 图片总体积
- 单个入口 chunk 体积
- 请求数（requests）
- 字体文件数量与体积
- 第三方脚本体积

### 2.2 时间型（Timing-based）

对「时间」设限，必须实际加载页面才能测出。

- LCP（Largest Contentful Paint）
- TBT（Total Blocking Time）
- TTI（Time to Interactive）
- FCP（First Contentful Paint）
- Speed Index

### 2.3 规则型（Rule-based）

对「工具给出的综合评价」设限，本质是一组规则的聚合结果。

- Lighthouse Performance 分数 ≥ 90
- Lighthouse Accessibility / Best Practices 分数
- Core Web Vitals 达标率（P75 三项全绿的页面占比）
- 具体审计项通过与否（如 `unused-javascript`、`uses-text-compression`）

### 2.4 三类对比与卡口适配性

| 维度 | 数量型 | 时间型 | 规则型 |
| --- | --- | --- | --- |
| **典型指标** | JS KB、请求数、图片总大小 | LCP、TBT、TTI | Lighthouse 分数、CWV 达标率 |
| **测量方式** | 读构建产物 | 实际加载页面 | 跑完整审计 |
| **耗时** | 秒级 | 分钟级 | 分钟级 |
| **结果确定性** | ✅ 极高，同一产物永远同一数字 | ❌ 低，受 CPU 争抢影响 | ⚠️ 中，分数是分段函数，跳变明显 |
| **与用户体验的距离** | 远（体积小不代表快） | 近 | 中 |
| **归因难度** | 低，能定位到具体依赖 | 高，需要 trace | 中，报告里有 audit 明细 |
| **适合做硬卡口（error）** | ✅ **非常适合** | ❌ 不适合 | ⚠️ 谨慎，建议 warn |
| **适合做趋势观察（warn）** | 可以，但没必要 | ✅ **首选** | ✅ 首选 |

三者的正确关系是**互补而非替代**：

```
数量型  →  快、稳、可硬卡  →  第一道防线，拦住「又胖了」
时间型  →  慢、抖、看趋势  →  第二层观察，发现「变慢了」
规则型  →  慢、跳变、给建议 →  第三层体检，告诉你「哪里不对」
真实用户 →  最慢、最真     →  最终验收，确认「用户真的更快了」
```

> ⚠️ 常见误解：以为「体积不涨就等于不会变慢」。体积只是必要条件之一——同样 200KB 的 JS，一个在首屏同步执行，一个在空闲时懒加载，对 TBT 的影响天差地别。所以数量型卡口必须配时间型观察，不能只做一半。

---

## 三、⚠️ 关键判断：CI 环境的时间类指标不稳定

这一节是整篇最需要建立正确认知的地方。绝大多数「Lighthouse CI 接入后被团队废弃」的案例，根因都在这里。

### 3.1 为什么 CI 上的时间指标会抖

CI runner 不是一台安静的机器：

| 抖动来源 | 具体表现 |
| --- | --- |
| **共享宿主的 CPU 争抢** | 云 runner 是虚拟机，同宿主上别的 job 在编译，你的 Chrome 抢不到 CPU |
| **CPU 型号不固定** | 同一个 runner 池里可能混着不同代际的机型，单核性能差一截 |
| **磁盘 / 网络 IO 波动** | 拉取依赖、读产物的耗时不稳定 |
| **冷启动与缓存状态** | 有没有命中构建缓存、Chrome 是不是首次启动 |
| **本地 server 的启动抖动** | 服务刚起来还在预热，首个请求慢 |
| **页面自身的随机性** | 接口 mock 延迟、A/B 分流、广告脚本 |

实际后果：**同一个 commit 连续跑两次，LCP 差 30% 是常态**，TBT 的相对波动往往比 LCP 更大（因为它是长任务超出部分之和，一次调度抖动就能翻倍）。

```
同一 commit 跑 10 次 LCP 分布（示意）
                                        阈值 2500ms
1800 ├─●                                     ┆
2000 ├───●   ●                                ┆
2200 ├─────────●  ●   ●                       ┆
2400 ├────────────────────●                   ┆
2600 ├──────────────────────────●  ←─ 超阈值   ┆ ✗
2900 ├─────────────────────────────────●  ←─ 超阈值 ✗
     └──────────────────────────────────────────────▶
     中位数 2250ms（达标），但 10 次里有 2 次会红
     ⇒ 硬卡口 = 20% 的 PR 无辜被拦
```

### 3.2 实践原则：分级断言

| 断言对象 | 严重级别 | 理由 |
| --- | --- | --- |
| JS / CSS / 图片体积 | **error（阻断）** | 同一产物必得同一数字，零假失败 |
| 请求数、资源条目数 | **error（阻断）** | 同上，确定性高 |
| LCP / TBT / TTI / Speed Index | **warn（告警）** | 波动 30%，硬卡必然假失败 |
| Lighthouse Performance 分数 | **warn（告警）** | 分数由时间指标折算，同样会抖 |
| Accessibility / SEO 类审计 | **error（阻断）** | 静态规则判定，结果稳定 |
| CLS | **warn** 起步 | 依赖字体/图片加载时序，不完全稳定 |

一句话记法：**结果确定的设 error，结果会抖的设 warn**。判断依据不是「这个指标重不重要」，而是「同一份代码跑两次结果会不会变」。

这个分级之所以有意义，是因为 Lighthouse CI 的三个 level 有明确的语义差异：

| level | 报告里的表现 | 进程退出码 | 效果 |
| --- | --- | --- | --- |
| `off` | 不检查 | 0 | 完全关闭该断言 |
| `warn` | 输出警告明细 | **0** | 记录趋势，**不阻断** CI |
| `error` | 输出错误明细 | **非 0** | **阻断** CI |

> 💡 只有 `error` 会让 `lhci assert` 退出码非 0，从而让 CI job 变红。这正是「体积类设 error、时间类设 warn」能落地的机制基础——warn 让你拿到全部数据用于观察，同时不会误伤任何一个 PR。

### 3.3 为什么假失败会摧毁卡口的公信力

这是团队协作层面的道理，比技术配置更重要：

```
时间类指标设成 error
        │
        ▼
20% 的 PR 被无辜拦住
        │
        ▼
开发第一反应：re-run（重跑一次就绿了）
        │
        ▼
「这个检查经常误报」成为团队共识
        │
        ├──▶ pre-commit 用 git commit --no-verify 跳过
        ├──▶ PR 里点 override / 找管理员强合
        └──▶ 有人提「把这个 job 设成 continue-on-error 吧」
        │
        ▼
卡口名义上存在，实际上永久绿灯
        │
        ▼
真实退化发生时，没人会认真看这个红灯 ✗✗✗
```

核心机制：**卡口的价值等于团队对它的信任度**。一个 80% 准确的卡口，比没有卡口更糟——因为它消耗了团队的注意力预算，还给了「我们有性能门禁」的虚假安全感。

所以设计卡口的第一原则是：**宁可少拦，不可错拦**。先只卡最确定的体积，把假失败率压到接近 0，让团队建立「这个红灯亮了就一定是真问题」的条件反射，之后再逐步收紧。

> 💡 面试加分点：能主动讲出「假失败率」这个概念，并说明卡口设计要权衡「拦截率 vs 信任度」，比背出一堆配置项更能体现工程经验。

### 3.4 想让时间类指标可用，需要做什么

如果确实需要把时间类指标做成有意义的门禁，有三个手段，成本递增：

**手段一：多次运行 + 选对聚合方式**

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // ❌ numberOfRuns: 1  单次结果就是一次采样，噪声全暴露
      // ✅ 跑多次采样，默认值是 3，抖动大的页面提到 5
      numberOfRuns: 5,
    },
    assert: {
      // 断言的默认聚合方式是 optimistic（取最有利的那次），对时间类指标过于宽松
      // ✅ 时间类指标显式改成 median，用中位数消除单次抖动
      assertions: {
        'largest-contentful-paint': [
          'warn',
          { aggregationMethod: 'median', maxNumericValue: 2500 },
        ],
      },
    },
  },
};
```

`numberOfRuns` 是最便宜的稳定手段，**默认值是 3**（CLI 简写 `-n`）。代价是 CI 时长线性增长：单次 40s 的页面跑 5 次就是 200s 以上。实践上 3~5 次是性价比区间，低于 3 次没有意义。

但仅仅跑多次是不够的——**多次运行的结果如何折算成一个判定值，由 `aggregationMethod` 决定**，这个字段是消除波动的另一半：

| `aggregationMethod` | 行为 | 什么时候用 |
| --- | --- | --- |
| `optimistic` | 取最有利于通过的那次结果（**默认值**） | 想要极低假失败率、只拦真正确定的退化 |
| `pessimistic` | 取最不利的那次结果 | 体积类等确定性指标，或要求严格的场合 |
| `median` | 取所有运行的中位数 | ✅ **时间类指标的推荐值**，最能代表典型表现 |
| `median-run` | 先选出「整体表现居中的那一次运行」，再取该次的值 | 需要断言值与某一份完整报告严格对应时 |

> ⚠️ 容易踩的坑：断言的默认配置是 `{ aggregationMethod: "optimistic", minScore: 1 }`。也就是说你以为「跑 5 次取中位数」，实际上默认取的是**最好的一次**——卡口比你预期宽松得多。要中位数就必须显式写 `aggregationMethod: 'median'`。

**手段二：固定节流参数**

不固定节流，就等于让指标跟着 runner 机型漂移。

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 5,
      settings: {
        // ✅ simulated：先按不节流跑，再用数学模型换算成慢网慢 CPU 下的成绩
        //    优点是快且方差小，缺点是模型换算，不等于真机
        throttlingMethod: 'simulated',
        throttling: {
          rttMs: 150,               // 往返延迟
          throughputKbps: 1638.4,   // 带宽 ≈ 1.6Mbps，移动慢速 4G
          cpuSlowdownMultiplier: 4, // CPU 降速 4 倍
        },
        // 明确 form factor 与视口，避免默认值随版本变化
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
      },
    },
  },
};
```

simulated 与 devtools 两种节流方式的区别：

| | `simulated`（模拟节流） | `devtools`（DevTools 节流） |
| --- | --- | --- |
| **原理** | 不节流实测，再用模型推算慢环境下的成绩 | 通过 CDP 真实限制网络与 CPU |
| **耗时** | 快 | 慢（真的要等） |
| **方差** | 小 | 大 |
| **真实性** | 模型推算，与真机有偏差 | 更接近真机行为 |
| **适用** | ✅ CI 里的默认选择 | 本地深度排查、怀疑模型失真时 |

> ⚠️ 两种方式测出来的数字不可互相比较。切换节流方式等于换了一把尺子，历史基线全部作废，必须重建。

**手段三：专用 runner**

彻底解决 CPU 争抢只能靠独占资源：用固定规格的 self-hosted runner，只跑性能任务，不与构建/测试混跑。成本最高，但这是让时间类指标真正可用作门禁的唯一途径。

如果拿不到专用 runner，就老老实实承认「CI 的时间指标只能看趋势」，把绝对值判定交给 3.5 的方案。

### 3.5 用「相对基线」代替「绝对阈值」

时间类指标的绝对值不可靠，但**同一 runner 上前后两次的相对差异**比绝对值可靠得多。Lighthouse CI 的断言支持两种模式：

```js
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        // ❌ 绝对阈值：CI 机器性能变了就得改数字
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],

        // ✅ 时间类先用 warn 收集趋势，不阻断
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
  },
};
```

真正的相对比对能力来自 LHCI Server（见第五章 5.7）：它保存历史报告，PR 报告会与目标分支的基线做 diff，输出「LCP +420ms」这样的相对结论。相对结论才是团队能据以决策的信息——「涨了 400ms」比「2.9s 超了 2.5s 的线」有说服力得多。

---

## 四、size-limit 实操：第一道防线

体积卡口应该是**第一道防线**，理由已经在第二、三章讲清了：它快（秒级）、稳（零方差）、归因明确（能指到具体依赖）。Lighthouse CI 该做的是补充观察，不该承担「拦住变胖」这个职责。

### 4.1 为什么选 size-limit

| | `size-limit` | `bundlesize` | 构建工具自带（webpack `performance`） |
| --- | --- | --- | --- |
| **测量口径** | 可选：只算体积 / 真实解析+执行时间 | 文件体积 | 文件体积 |
| **glob 多文件汇总** | ✅ 支持，可把多个文件算作一个预算 | ✅ 支持 | ❌ 只看单文件与入口 |
| **超标归因** | ✅ `--why` 直接给出体积构成 | ❌ 无 | ❌ 无 |
| **PR 内评论体积变化** | ✅ 官方 GitHub Action | ⚠️ 需自建 | ❌ 无 |
| **能否独立于构建工具** | ✅ 可直接量已产出的文件 | ✅ | ❌ 与构建耦合 |
| **维护活跃度** | 活跃 | 基本停滞 | 随构建工具 |

结论：新项目直接上 `size-limit`；`bundlesize` 属于历史方案，遇到存量配置可以迁移。

### 4.2 配置：写在 package.json 里

最省事的方式是直接放 `package.json`，不用多一个文件：

```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  },
  "devDependencies": {
    "@size-limit/preset-app": "*",
    "size-limit": "*"
  },
  "size-limit": [
    {
      "name": "主入口（首屏必需）",
      "path": "dist/assets/index-*.js",
      "limit": "150 kB",
      "gzip": true
    },
    {
      "name": "React 运行时 vendor",
      "path": "dist/assets/vendor-react-*.js",
      "limit": "45 kB",
      "gzip": true
    },
    {
      "name": "全站 CSS",
      "path": "dist/assets/*.css",
      "limit": "30 kB",
      "gzip": true
    },
    {
      "name": "首屏 JS 总量（入口 + 同步依赖）",
      "path": ["dist/assets/index-*.js", "dist/assets/vendor-*.js"],
      "limit": "220 kB",
      "gzip": true
    }
  ]
}
```

> 💡 `devDependencies` 里的 `"*"` 只是笔记里的占位写法。实际项目请让包管理器写入具体版本并提交 lockfile，否则 CI 每次可能装到不同版本，体积口径会漂。

也可以单独放 `.size-limit.json`（结构就是上面那个数组）：

```json
[
  {
    "name": "主入口",
    "path": "dist/assets/index-*.js",
    "limit": "150 kB",
    "gzip": true
  },
  {
    "name": "后台管理页（懒加载，额度可放宽）",
    "path": "dist/assets/admin-*.js",
    "limit": "300 kB",
    "gzip": true
  }
]
```

### 4.3 关键：按入口分别设限，不要只设一个总量

这是很多团队配置失效的原因。只设「JS 总量 500KB」这一条时：

```
// ❌ 只有总量预算
JS 总量 ≤ 500 kB
  ├── 首屏入口   180 kB  ← 真正影响 LCP 的部分
  ├── 后台管理页 200 kB  ← 懒加载，用户可能永远不访问
  └── 报表页     100 kB  ← 懒加载
总计 480 kB → 通过 ✅

某次迭代：首屏入口涨到 260 kB，后台管理页瘦身到 120 kB
总计 480 kB → 依然通过 ✅   但首屏实际慢了一大截 ✗✗✗


// ✅ 按入口分别设限
首屏入口     ≤ 200 kB  ← 260 kB 直接卡住 ✗ 立刻暴露
后台管理页   ≤ 300 kB
报表页       ≤ 150 kB
首屏 JS 总量 ≤ 220 kB  ← 再加一条汇总兜底
```

设限的分层原则：

| 预算对象 | 松紧 | 理由 |
| --- | --- | --- |
| **首屏同步入口** | 最严，只留 5%~10% 余量 | 直接决定 LCP / TBT |
| **框架 vendor** | 严，且几乎不该变 | 一变就意味着框架升级或误引入，值得人看一眼 |
| **懒加载路由 chunk** | 宽松 | 不影响首屏，卡太严会阻碍业务开发 |
| **CSS** | 中等 | 阻塞渲染，但增长通常缓慢 |
| **公共 chunk** | 严 | 被多路由共享，膨胀影响面大 |

### 4.4 gzip 还是 brotli：口径选择

```json
[
  {
    "name": "gzip 口径（保守，兼容所有客户端）",
    "path": "dist/assets/index-*.js",
    "limit": "150 kB",
    "gzip": true
  },
  {
    "name": "brotli 口径（贴近现代 CDN 实际传输）",
    "path": "dist/assets/index-*.js",
    "limit": "128 kB",
    "brotli": true
  }
]
```

| 口径 | 相对原始体积 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **原始（不压缩）** | 100% | 反映解析成本 | 与实际传输量差太远，数字虚高 |
| **gzip** | ≈ 30% | 兼容性天花板，所有 CDN 都支持 | 比实际传输量偏保守 |
| **brotli** | ≈ 25%，比 gzip 小 15%~20% | 最贴近现代 CDN 真实传输量 | 老客户端可能回落到 gzip |

选择建议：

1. **和线上 CDN 实际启用的压缩算法保持一致**——这是唯一硬要求。CDN 开了 brotli 就用 brotli 口径，否则预算数字和真实传输量脱节。
2. **全项目只用一种口径**。同一个仓库里一部分按 gzip、一部分按 brotli，任何跨模块比较都会出错。
3. **切换口径时必须重设所有 limit 数字**，并在 PR 描述里写清楚。否则会被误读成「一夜之间瘦了 18%」。
4. **不要用原始体积做主口径**。它唯一有价值的场景是评估 JS 解析/编译成本（解析的是解压后的代码），可以作为辅助预算单列一条。

### 4.5 超标了：用 --why 归因

卡口拦住之后，开发第一个问题一定是「到底是什么变大了」。没有归因能力的卡口会变成负担。

```bash
# 正常检查
npx size-limit

# 输出示例
#   主入口（首屏必需）
#   Size limit: 150 kB
#   Size:       163.4 kB with all dependencies, minified and gzipped
#   ✗ Size limit has been exceeded by 13.4 kB

# 归因：生成体积构成分析
npx size-limit --why
# 会打开可视化的体积构成报告，逐依赖看谁占了多少
```

配合排查思路：

```bash
# 1. 先确认是不是新引入的依赖
git diff origin/main -- package.json

# 2. 查某个包为什么在产物里（谁引入了它）
npm ls date-fns          # npm
pnpm why date-fns        # pnpm

# 3. 对比 main 分支的体积基线，确认涨幅
git stash && npm run build && npx size-limit   # 基线
git stash pop && npm run build && npx size-limit  # 当前
```

常见超标根因与对策：

| 根因 | 典型信号 | 对策 |
| --- | --- | --- |
| 引入了全量工具库 | 多出 `lodash` / `moment` 整包 | 换按需引入或轻量替代（`date-fns`、原生 `Intl`） |
| 组件库全量引入 | 多出大段 UI 库代码 | 按需引入 / 配置 tree-shaking 友好的入口 |
| 该懒加载的没懒加载 | 后台页代码出现在首屏 chunk | 改成 `React.lazy` + 动态 `import()` |
| barrel 文件破坏 tree-shaking | 只用一个函数却引入整个模块 | 直接从子路径导入，避免 `index.ts` 再导出 |
| polyfill 过度 | 多出大量 core-js 模块 | 收紧 browserslist 目标 |
| 图标以 JS 形式全量打入 | 图标库体积异常 | 换 SVG sprite 或按需生成 |
| sourcemap 被算进预算 | 数字异常大 | 修正 `path` glob，排除 `*.map` |

### 4.6 GitHub Action：在 PR 里自动评论体积变化

只让 CI 变红是不够的，**开发需要看到「涨了多少」而不只是「超了」**。官方 Action 会自动比对基准分支并在 PR 里留评论。

```yaml
# .github/workflows/size-limit.yml
name: Size Limit

on:
  pull_request:
    branches: [main]

# 评论 PR 需要写权限
permissions:
  contents: read
  pull-requests: write

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      # ✅ CI 用 npm ci，严格按 lockfile 安装，保证体积口径可复现
      # ❌ 不要用 npm install，它可能更新依赖版本导致体积漂移
      - run: npm ci

      - name: Check size limit
        uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          # Action 会自动 build 基准分支与当前分支并对比
          build_script: build
          # 只想告警不阻断时打开（不推荐，体积类应该硬卡）
          # skip_step: install
```

PR 评论的效果大致是这样一张表：

```
Size Limit Report

| Name                 |    Size |  Loading | Diff             |
|----------------------|---------|----------|------------------|
| 主入口（首屏必需）    | 163.4 kB| 3.2 s    | +13.4 kB (+8.9%) |
| React 运行时 vendor  |  44.1 kB| 0.9 s    | 0 B              |
| 全站 CSS             |  28.7 kB| 0.6 s    | +1.2 kB (+4.4%)  |
```

这张表的真正价值在于**让累积退化变得可见**。回到第一章的立论：code review 拦不住 `+8KB`，是因为那个数字根本不在评审视野里。把它印在每一个 PR 上之后，「这次为什么涨了 13KB」就成了一个自然会被提出的问题——**卡口的价值一半来自阻断，一半来自可见性**。

如果不用 GitHub，等价做法是在 CI 里跑 `size-limit --json` 输出结果，与基线 JSON 比对后写入 MR 评论。

### 4.7 只想要最简版本

不想装 Action、只要一个硬卡口的话，两行就够：

```yaml
      - run: npm run build
      # size-limit 超标时退出码非 0，job 自动变红
      - run: npx size-limit
```

这就是「第一道防线」的最小完整形态：秒级、零假失败、超标必红。**任何团队接入性能卡口都应该从这两行开始**，而不是从 Lighthouse CI 开始。

---

## 五、Lighthouse CI 完整实操

体积卡口拦住「变胖」，但拦不住「同样体积却变慢」。Lighthouse CI 补的是这一层。

### 5.1 安装与 autorun 的三个阶段

```bash
# 全局或项目内装 CLI
npm i -D @lhci/cli

# 交互式向导，帮你生成初始配置（也可以直接手写配置）
npx lhci wizard

# 一条命令跑完整流程
npx lhci autorun
```

`lhci autorun` 是三个子命令的编排，理解这三段是配置的前提：

```
lhci autorun
    │
    ├─ ① collect  ── 起服务（或读静态目录）→ 跑 N 次 Lighthouse → 产出报告到 .lighthouseci/
    │                 对应配置：ci.collect
    │
    ├─ ② assert   ── 读取报告 → 逐条比对 assertions → 有 error 则退出码非 0
    │                 对应配置：ci.assert          ← 卡口在这里生效
    │
    └─ ③ upload   ── 把报告推到指定 target，供人查看与历史比对
                      对应配置：ci.upload
```

对应的单独命令（调试时很有用，能只跑其中一段）：

```bash
npx lhci collect --url=http://localhost:4173/ -n=3
npx lhci assert --preset=lighthouse:recommended
npx lhci upload --target=temporary-public-storage
```

> ⚠️ 在 `autorun` 下给子命令传 flag **必须用 `=` 形式**（`--collect.numberOfRuns=5`），空格形式解析不到。

### 5.2 配置文件位置与查找顺序

Lighthouse CI 按以下顺序查找配置，**命中第一个就停止**：

```
.lighthouserc.js  →  lighthouserc.js  →  .lighthouserc.cjs  →  lighthouserc.cjs
    →  .lighthouserc.json  →  lighthouserc.json
    →  .lighthouserc.yml / .yaml  →  lighthouserc.yml / .yaml
```

两个要点：

1. **不会向上级目录查找**。Monorepo 里在子包目录跑 `lhci`，它不会去仓库根目录找配置。
2. 放在别处就必须显式指定：

```bash
# ✅ 自定义位置用 --config
npx lhci autorun --config=./config/lighthouse/lighthouserc.js

# ❌ 以为它会自动往上找根目录的配置 —— 不会
cd packages/web && npx lhci autorun
```

顶层结构固定为 `ci` 下的五个区块：

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {}, // 怎么采集
    assert: {},  // 怎么断言（卡口）
    upload: {},  // 报告存哪
    server: {},  // 仅在自建 LHCI Server 时用
    wizard: {},  // 向导相关，一般不手写
  },
};
```

### 5.3 完整可用的 lighthouserc.js

这是一份体现前面所有判断的配置——**体积类 error，时间类 warn**：

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      // 待测页面，多页应用列多个 URL
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/product/1',
      ],

      // 让 lhci 自己起服务：适合需要真实 server（SSR、代理、history fallback）的场景
      startServerCommand: 'npm run preview',
      // 从服务输出里匹配到这个正则才认为「起来了」，默认 "listen|ready"
      startServerReadyPattern: 'Local:',
      // 等待超时，默认 10000ms；构建产物大或冷启动慢的项目要放宽
      startServerReadyTimeout: 30000,

      // 采样次数，默认 3
      numberOfRuns: 5,

      // SPA 项目务必开启：告诉 lhci 页面是客户端路由驱动的
      isSinglePageApplication: true,

      // settings 里的字段直接透传给 Lighthouse 本体
      settings: {
        // 固定节流参数，否则指标随 runner 机型漂移
        throttlingMethod: 'simulated',
        throttling: {
          rttMs: 150,
          throughputKbps: 1638.4,
          cpuSlowdownMultiplier: 4,
        },
        formFactor: 'mobile',
        screenEmulation: {
          mobile: true,
          width: 412,
          height: 823,
          deviceScaleFactor: 1.75,
          disabled: false,
        },
        // 跳过与本次关注无关、且耗时的审计
        skipAudits: ['uses-http2'],
        // 保留 localStorage / Service Worker 状态（需要登录态时才开）
        disableStorageReset: false,
        // CI 容器里 Chrome 必须关沙箱
        chromeFlags: '--no-sandbox --disable-dev-shm-usage',
      },
    },

    assert: {
      // preset 提供一整套基线，再用 assertions 局部覆盖
      preset: 'lighthouse:recommended',

      assertions: {
        // ===== 体积类：error，硬卡口。单位是「字节」=====
        'resource-summary:script:size': ['error', { maxNumericValue: 230000 }],
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 60000 }],
        'resource-summary:image:size': ['error', { maxNumericValue: 400000 }],
        'resource-summary:font:size': ['error', { maxNumericValue: 120000 }],
        'resource-summary:total:size': ['error', { maxNumericValue: 1000000 }],

        // ===== 数量类：error，同样确定 =====
        'resource-summary:script:count': ['error', { maxLength: 12 }],
        'resource-summary:third-party:count': ['error', { maxLength: 8 }],

        // ===== 时间类：warn，只观察趋势，绝不阻断 =====
        // 显式取中位数，否则默认 optimistic（取最好的一次）
        'largest-contentful-paint': [
          'warn',
          { aggregationMethod: 'median', maxNumericValue: 2500 },
        ],
        'total-blocking-time': [
          'warn',
          { aggregationMethod: 'median', maxNumericValue: 300 },
        ],
        'cumulative-layout-shift': [
          'warn',
          { aggregationMethod: 'median', maxNumericValue: 0.1 },
        ],
        'speed-index': ['warn', { aggregationMethod: 'median', maxNumericValue: 3400 }],
        interactive: ['warn', { aggregationMethod: 'median', maxNumericValue: 3800 }],

        // ===== 分类分数：由时间指标折算，同样会抖，warn =====
        'categories:performance': ['warn', { minScore: 0.9 }],
        // 静态规则判定，稳定，可以 error
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // ===== 明确关掉不适用的项，避免 recommended 带来的噪声 =====
        'uses-http2': 'off',
        'canonical': 'off',
        // 业务自定义打点也能断言（对应 performance.measure 的名字）
        // 'user-timings:app-mounted': ['warn', { maxNumericValue: 1500 }],
      },
    },

    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

> ⚠️ **单位陷阱**：`assertions` 里 `maxNumericValue` 用的是**字节**，而 `budget.json`（见 5.5）里用的是**千字节（KB）**。同一个 230KB 的预算，前者写 `230000`，后者写 `230`——**写混了阈值会差约 1024 倍**，表现就是「卡口形同虚设」或「所有 PR 全红」。

### 5.4 preset 怎么选

`assert.preset` 提供三套预制断言集，作为 `assertions` 的基线：

| preset | 内容 | 达标难度 | 适用 |
| --- | --- | --- | --- |
| `lighthouse:all` | 要求**所有**审计项满分 | 极难，几乎没有真实项目能过 | 只作为参照，不建议直接用 |
| `lighthouse:recommended` | 性能之外的分类要求满分；**性能分低于 90 分给 warn** | 中等 | ✅ 大多数项目的起点 |
| `lighthouse:no-pwa` | 同 recommended，但去掉 PWA 相关项 | 中等 | 不做 PWA 的项目 |

取舍建议：

1. **从 `lighthouse:recommended` 起步，用 `assertions` 覆盖**。它的性能部分本来就是 warn 级别，与本篇的分级原则天然一致。
2. **不要直接裸用 `lighthouse:all`**。它会带来几十条与业务无关的红项，团队第一天就会想关掉整个 job，正好落入 3.3 的陷阱。
3. **不用 preset 也完全可行**——只写 `assertions`，一条条明确列出关心的项。可控性最高，代价是要自己维护清单。存量项目接入时推荐这条路：从 3~5 条最确定的体积断言开始，逐步加。
4. `preset` 与 `assertions` 可以并存，`assertions` 优先级更高，用来加严、放宽或 `off` 掉某项。

### 5.5 budgets.json 单独配资源预算

除了写在 `assertions` 里，Lighthouse 还支持标准的 budget 文件格式，按 `resourceType` 分类设限：

```json
[
  {
    "path": "/*",
    "resourceSizes": [
      { "resourceType": "script", "budget": 230 },
      { "resourceType": "stylesheet", "budget": 60 },
      { "resourceType": "image", "budget": 400 },
      { "resourceType": "font", "budget": 120 },
      { "resourceType": "media", "budget": 0 },
      { "resourceType": "third-party", "budget": 150 },
      { "resourceType": "total", "budget": 1000 }
    ],
    "resourceCounts": [
      { "resourceType": "script", "budget": 12 },
      { "resourceType": "stylesheet", "budget": 4 },
      { "resourceType": "image", "budget": 20 },
      { "resourceType": "font", "budget": 3 },
      { "resourceType": "third-party", "budget": 8 },
      { "resourceType": "total", "budget": 45 }
    ]
  },
  {
    "path": "/admin/*",
    "resourceSizes": [{ "resourceType": "script", "budget": 500 }]
  }
]
```

字段说明：

| 字段 | 含义 | 单位 |
| --- | --- | --- |
| `path` | 适用的 URL 路径模式，支持 `*` | — |
| `resourceSizes` | 按资源类型限制**体积** | **千字节（KB）** |
| `resourceCounts` | 按资源类型限制**数量** | 个 |
| `resourceType` | `script` / `stylesheet` / `image` / `font` / `media` / `document` / `other` / `third-party` / `total` | — |

引用方式：

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: { url: ['http://localhost:4173/'] },
    assert: {
      // ✅ budgetsFile 单独使用
      budgetsFile: './budget.json',
    },
  },
};
```

> ⚠️ **互斥陷阱（最容易踩）**：`budgetsFile` **不能与任何其他 assert 选项同时使用**。下面这种写法是错的：
>
> ```js
> // ❌ 错误：budgetsFile 与 preset / assertions 互斥
> assert: {
>   preset: 'lighthouse:recommended',
>   budgetsFile: './budget.json',
>   assertions: { 'categories:performance': ['warn', { minScore: 0.9 }] },
> }
> ```
>
> 要么只用 `budgetsFile`，要么只用 `preset` + `assertions`。

那么「既要资源预算、又要分数断言」怎么办？**统一用 `assertions`，把预算写成 `resource-summary:<resourceType>:(size|count)` 形式**——这就是 5.3 那份配置的做法：

```js
// ✅ 用 assertions 表达资源预算，就能与 preset / 其他断言共存
assert: {
  preset: 'lighthouse:recommended',
  assertions: {
    // 注意单位是字节，不是 KB
    'resource-summary:script:size': ['error', { maxNumericValue: 230000 }],
    'resource-summary:script:count': ['error', { maxLength: 12 }],
    'categories:performance': ['warn', { minScore: 0.9 }],
  },
}
```

两种写法的选择：

| | `budgetsFile` | `assertions` 里的 `resource-summary:*` |
| --- | --- | --- |
| **能否与 preset / 其他断言共存** | ❌ 不能 | ✅ 能 |
| **单位** | KB | 字节 |
| **按路径分别设预算** | ✅ 原生支持 `path` | 需要用 `assertMatrix` |
| **格式通用性** | ✅ 是 Lighthouse 标准格式，其他工具也认 | 仅 LHCI |
| **推荐场景** | 只做资源预算、不做分数断言 | ✅ **绝大多数项目** |

### 5.6 多页面差异化断言：assertMatrix

首页和后台管理页的合理预算显然不同。`assertMatrix` 按 URL 模式配不同断言：

```js
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:4173/',
        'http://localhost:4173/admin/dashboard',
      ],
      numberOfRuns: 3,
    },
    assert: {
      // ⚠️ 用 assertMatrix 时不要再写顶层 assertions
      assertMatrix: [
        {
          matchingUrlPattern: 'http://localhost:4173/$',
          assertions: {
            // 首屏最严
            'resource-summary:script:size': ['error', { maxNumericValue: 200000 }],
            'largest-contentful-paint': [
              'warn',
              { aggregationMethod: 'median', maxNumericValue: 2500 },
            ],
          },
        },
        {
          matchingUrlPattern: '.*/admin/.*',
          assertions: {
            // 后台页登录后才用，预算放宽
            'resource-summary:script:size': ['error', { maxNumericValue: 500000 }],
            'largest-contentful-paint': 'off',
          },
        },
      ],
    },
  },
};
```

### 5.7 upload.target 三种选择

| target | 存哪 | 优点 | 缺点 | 适用 |
| --- | --- | --- | --- | --- |
| `temporary-public-storage` | Google 提供的临时公共存储 | 零成本、零运维、一行配置即可用，PR 里能点开完整报告 | ⚠️ **任何拿到链接的人都能访问**；⚠️ **几天后自动清除**，无长期历史 | 开源项目、临时验证、POC |
| `lhci`（**默认值**） | 自建 LHCI Server | ✅ 报告长期留存；✅ 有历史趋势图；✅ 能与基线分支做 diff | 需要部署与维护服务 + 数据库 | ✅ **内部项目、需要看趋势的团队** |
| `filesystem` | 本地目录 | 完全不出网，最符合内网合规要求 | ⚠️ **失去 GitHub 详细状态检查能力**（PR 里点不进报告）；需自己解决存储与展示 | 强网络隔离环境 |

```js
// 方案 A：临时公共存储 —— 注意它是公开的，内部项目不要用
upload: {
  target: 'temporary-public-storage',
},

// 方案 B：自建 LHCI Server（默认 target）
upload: {
  target: 'lhci',
  serverBaseUrl: 'https://lhci.internal.example.com', // 默认 http://localhost:9001/
  token: process.env.LHCI_BUILD_TOKEN,               // 项目级 build token
},

// 方案 C：写到文件系统
upload: {
  target: 'filesystem',
  outputDir: './lhci-reports',
},
```

GitHub 集成字段跨 target 通用（用于把状态检查写回 PR）：

```js
upload: {
  target: 'temporary-public-storage',
  githubToken: process.env.LHCI_GITHUB_TOKEN,
  // 或使用 GitHub App 方式
  // githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
  // 同一 PR 上跑多组配置时，用后缀区分状态检查名称
  githubStatusContextSuffix: '-mobile',
},
```

> 💡 **选型判断**：内部项目**不要**用 `temporary-public-storage`。它的两个特性——公开可访问、几天后清除——决定了它只适合开源或一次性验证。内部项目要么自建 LHCI Server，要么用 `filesystem` 加自己的产物存储。

### 5.8 历史基线比对：为什么必须有 LHCI Server

这是很多团队接了 Lighthouse CI 却觉得「没什么用」的关键原因。

只有断言、没有历史时，你能得到的信息是：

```
✗ largest-contentful-paint failure  expected <= 2500, found 2680
```

这句话无法支撑任何决策——2680 到底是「本来就在 2600 附近波动」还是「这个 PR 让它从 1900 涨到了 2680」？开发看不出区别，只能选择重跑。

有 LHCI Server 之后：

```
                LCP 趋势（LHCI Server 面板）
2800 ┤                                        ●  ← 当前 PR
2600 ┤
2400 ┤
2200 ┤
2000 ┤  ●───●───●───●───●───●───●───●───●        ← main 分支基线
1800 ┤
     └──────────────────────────────────────────▶
      结论：main 稳定在 2000ms 附近，本 PR 涨了 +680ms
      ⇒ 这不是噪声，是真实退化，值得查
```

LHCI Server 提供三个不可替代的能力：

| 能力 | 为什么必须有 |
| --- | --- |
| **历史留存** | 判断「现在的值算不算退化」，必须知道过去的值 |
| **基线 diff** | PR 报告自动与目标分支基线比对，输出相对差异而非绝对值 |
| **趋势图** | 发现第一章那种「缓慢累积」的曲线——单点断言永远看不出斜率 |

回到全篇立论：**性能腐化是一条曲线，而断言只是曲线上的一个点**。要看见曲线，就必须有一个地方存着所有历史点。这就是 LHCI Server 的全部价值。

最小部署方式：

```bash
# LHCI Server 随 CLI 一起分发，可用 sqlite 快速起一个
npx lhci server --port=9001 \
  --storage.storageMethod=sql \
  --storage.sqlDialect=sqlite \
  --storage.sqlDatabasePath=./lhci.db

# 首次需要创建项目，拿到 build token 与 admin token
npx lhci wizard   # 选择 new-project
```

> ⚠️ sqlite 只适合试用。长期使用请换 Postgres/MySQL，并把数据目录挂到持久卷——LHCI Server 的价值全在历史数据上，数据丢了等于白接。

### 5.9 GitHub Actions 完整 workflow

关键顺序是 **install → build → 起本地 server → 跑 lhci**。`lhci` 自己能负责起服务那一步。

```yaml
# .github/workflows/lighthouse-ci.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main] # 主干也跑，才能积累基线

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - run: npm ci

      # 必须先构建出产物，lhci 测的是生产构建而非 dev server
      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          LHCI_TOKEN: ${{ secrets.LHCI_TOKEN }}

      # 断言失败也要保留报告，方便排查
      - name: Upload artifacts
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: lighthouse-reports
          path: .lighthouseci/
          retention-days: 7
```

上面依赖 `lighthouserc.js` 里的 `startServerCommand` 起服务。**如果产物是纯静态的，用 `staticDistDir` 更简单也更稳**——lhci 会自己起一个静态服务，不需要你管端口、就绪判定和进程回收：

```js
// lighthouserc.js —— 纯静态站点的推荐写法
module.exports = {
  ci: {
    collect: {
      // ✅ 纯静态产物：直接指目录，不用 startServerCommand
      staticDistDir: './dist',
      // url 可省略，lhci 会自动发现 HTML 文件；也可显式指定路径
      numberOfRuns: 3,
    },
  },
};
```

两种方式的选择：

| | `staticDistDir` | `startServerCommand` |
| --- | --- | --- |
| **适用产物** | 纯静态 HTML/JS/CSS | SSR、需要 API 代理、history fallback 的 SPA |
| **端口与就绪判定** | lhci 自动处理 | 需配 `startServerReadyPattern` / `startServerReadyTimeout` |
| **稳定性** | ✅ 更高，少一个抖动来源 | 服务预热会引入抖动 |
| **推荐** | ✅ 能用就用 | 只在必须真实 server 时用 |

如果需要手工起服务（比如要先跑数据 mock），用 `wait-on` 等就绪再跑：

```yaml
      - name: Start server
        run: npm run preview &

      - name: Wait for server
        run: npx wait-on http://localhost:4173 --timeout 60000

      - name: Run Lighthouse CI
        run: npx lhci autorun --collect.url=http://localhost:4173/
```

> ⚠️ 注意 flag 的 `=` 写法。`--collect.url http://localhost:4173/` 这种空格形式在 `autorun` 下解析不到。

### 5.10 所有配置都可被环境变量与 flag 覆盖

三种配置来源，优先级从低到高：**配置文件 < `LHCI_` 环境变量 < CLI flag**。

```bash
# 环境变量形式：LHCI_ 前缀 + 选项名
LHCI_NUMBER_OF_RUNS=1 npx lhci autorun          # 本地快速验证，只跑一次
LHCI_TOKEN=xxx npx lhci upload

# CLI flag 形式（autorun 下必须用 = ）
npx lhci autorun --collect.numberOfRuns=1 --upload.target=filesystem
```

实用场景：**同一份配置文件服务多种环境**。PR 上跑 `numberOfRuns=3` 求快，定时巡检用 `--collect.numberOfRuns=9` 求准，配置文件不用改。

---

## 六、Webpack / Vite 侧的内置预算

构建工具自带轻量预算能力，成本几乎为零，适合作为「兜底提示」而非正式卡口。

### 6.1 Webpack 的 performance 配置

```js
// webpack.config.js
module.exports = {
  performance: {
    // 'warning'（默认）| 'error' | false
    hints: 'error',
    // 单个产物文件体积上限，单位：字节
    maxAssetSize: 250 * 1024,
    // 单个入口（entrypoint）所有初始资源之和的上限，单位：字节
    maxEntrypointSize: 400 * 1024,
    // 只对参与预算计算的文件过滤，排除 sourcemap 与图片
    assetFilter(assetFilename) {
      // ❌ 不过滤：.map 文件动辄几 MB，会让预算永远超标
      // ✅ 只统计真正下发给用户的 JS/CSS
      return /\.(js|css)$/.test(assetFilename);
    },
  },
};
```

三个字段的区别（面试常混）：

| 字段 | 统计对象 | 典型值 |
| --- | --- | --- |
| `maxAssetSize` | **单个文件** | 250 KB |
| `maxEntrypointSize` | **单个入口的全部初始资源之和**（该入口首次加载必需的 JS + CSS） | 400 KB |
| `hints` | 超标时的表现：`'warning'` 只打印警告；`'error'` 让构建**失败**（退出码非 0） | CI 里设 `'error'` |

> ⚠️ `hints: 'error'` 会让 `webpack` 构建直接失败，等于把预算变成硬卡口。这在 CI 里是可行的（体积确定性高），但会把「预算超标」和「构建错误」混为一类，日志里不好区分。更清晰的做法是保持 `'warning'`，把硬卡口交给 `size-limit`。

### 6.2 Vite 的 chunkSizeWarningLimit

```js
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // 单个 chunk 超过该值时打印警告，单位：kB（注意不是字节）
    chunkSizeWarningLimit: 500,
    // 警告依据的是压缩前体积；想按压缩后判断可关闭报告以提速，但会失去参考
    reportCompressedSize: true,
  },
});
```

> ⚠️ `chunkSizeWarningLimit` **只是警告，不会让构建失败**，也没有开关能让它变成 error。它的作用是提醒开发者「这个 chunk 该拆了」，不是卡口。很多人把调大这个值当成「解决了体积问题」——实际上只是关掉了提醒。

### 6.3 内置预算的局限

| 局限 | 说明 | 后果 |
| --- | --- | --- |
| **只看单文件 / 单入口** | 不统计「全站 JS 总量」这种跨文件汇总 | 拆成 10 个 240KB 的 chunk 就能全部绕过 |
| **不看真实加载** | 不知道哪些 chunk 会在首屏被实际请求 | 懒加载和同步加载被同等对待 |
| **不看压缩后体积** | webpack 的 `performance` 按未压缩体积算 | 数字虚高，与真实传输量脱节 |
| **不含图片 / 字体 / 第三方** | 只关心构建产出的 JS/CSS | 图片膨胀、第三方脚本膨胀完全看不见 |
| **无历史与 diff** | 只给当前值，不给涨幅 | 看不见累积退化 |
| **无 PR 可见性** | 只在构建日志里 | 开发不会去翻日志 |

三者的正确定位：

```
构建工具内置预算  →  开发时的即时提醒（几乎零成本，装了就有）
        ↓
size-limit        →  PR 上的硬卡口（多口径、可汇总、有 diff、有评论）
        ↓
Lighthouse CI     →  时间与规则维度的观察（真实加载、有历史趋势）
```

结论：**内置预算不能替代 size-limit**。它的价值是在本地开发阶段就让开发者看到「这个 chunk 胖了」，属于左移的提醒，不是门禁。

---

## 七、卡口该设在哪个环节

### 7.1 流水线全景

```
   开发本地                    PR / MR                 合并后主干            定时巡检
      │                          │                         │                    │
┌─────┴──────┐         ┌─────────┴─────────┐      ┌────────┴────────┐   ┌───────┴────────┐
│ pre-commit │         │  必须秒级~分钟级   │      │  可以慢，不阻塞  │   │  可以很慢       │
│  秒级      │         │  开发在等结果      │      │  开发已经走了    │   │  夜间跑         │
├────────────┤         ├───────────────────┤      ├─────────────────┤   ├────────────────┤
│ lint-staged│         │ lint / typecheck  │      │ 全量测试         │   │ 多页面 LH 巡检  │
│ 变更文件   │  ────▶  │ 单元测试          │ ──▶  │ E2E 核心链路     │──▶│ numberOfRuns=9  │
│ 格式化     │         │ build            │      │ Lighthouse CI    │   │ 真实机型/多网络 │
│            │         │ ✅ size-limit     │      │ 写入 LHCI 基线   │   │ CrUX / RUM 汇总 │
│ ❌ 不放性能 │         │ ⚠️ LH（warn，可选）│      │ 产物分析报告     │   │ 趋势周报        │
└────────────┘         └───────────────────┘      └─────────────────┘   └────────────────┘
   反馈最快                  反馈快 + 有拦截力          反馈慢但最全        反馈最慢但最真
   成本必须最低              成本中等                    成本可高            成本最高
```

### 7.2 各环节适合放什么

| 环节 | 时间预算 | 适合的性能检查 | 不适合的 | 判断依据 |
| --- | --- | --- | --- | --- |
| **本地 pre-commit** | < 5s | 无（最多做变更文件的 lint / 格式化） | ❌ 任何构建、❌ size-limit、❌ Lighthouse | 需要完整构建才能算体积，必然超过 5s |
| **PR CI** | 3~10 min | ✅ **size-limit（error）**、⚠️ Lighthouse CI（时间类 warn） | ❌ 多页面全量巡检、❌ `numberOfRuns` > 5 | 开发在等结果，超过 10 分钟就会去干别的，反馈闭环断掉 |
| **合并后主干** | 10~30 min | ✅ Lighthouse CI 全页面、✅ 写入 LHCI 基线、✅ 产物构成分析 | ❌ 期望它阻断（代码已经进主干了） | 不阻塞任何人，可以慢；主要职责是**积累基线**与事后告警 |
| **定时巡检** | 不限 | ✅ `numberOfRuns=9` 高精度、✅ 多机型多网络、✅ CrUX/RUM 汇总、✅ 竞品对比 | ❌ 把它当卡口 | 无人等待，可以做最贵的测量；产出趋势周报 |

### 7.3 判断依据：反馈速度 vs 检查成本

```
   拦截价值
      ▲
  高  │  ┌──────────────┐   ┌────────────────────┐
      │  │ size-limit   │   │  Lighthouse CI     │
      │  │ 快 + 能拦    │   │  慢 + 只能观察      │
      │  │ ⇒ 放 PR CI   │   │  ⇒ 放主干/巡检      │
      │  └──────────────┘   └────────────────────┘
      │
      │  ┌──────────────┐   ┌────────────────────┐
  低  │  │ 格式化/lint  │   │  多机型全量巡检     │
      │  │ ⇒ pre-commit │   │  ⇒ 定时任务         │
      │  └──────────────┘   └────────────────────┘
      └──────────────────────────────────────────▶
        秒级                            分钟级/小时级
                        检查成本
```

两条硬规则：

**规则一：慢的检查绝对不要放 pre-commit。**

```bash
# ❌ 反例：把 size-limit 塞进 pre-commit
# .husky/pre-commit
npm run build && npx size-limit    # 每次 commit 等 90 秒

# 必然的结局：
git commit -m "fix typo" --no-verify   # 开发学会了这个 flag
# 从此所有 pre-commit 检查（包括真正该跑的 lint）一起失效 ✗✗✗
```

`--no-verify` 的杀伤力在于它是**全量跳过**的：开发为了绕过一个慢检查，顺手把该环节所有检查都跳了。这和 3.3 的假失败是同一类问题——**任何让开发觉得「碍事」的卡口，最终都会被整体绕过，并连带毁掉同环节的其他检查**。

**规则二：拦截职责放能拦的地方，观察职责放能慢的地方。**

- 想拦住退化 → 必须放在**合并之前**（PR CI），且必须快且稳 → 只有体积类符合
- 想看清趋势 → 放在**合并之后**（主干 / 巡检），可以慢可以抖 → 时间类与规则类归这里

> 💡 常见错误是反过来：把 Lighthouse CI 设成 PR 阻断（慢 + 抖，两头不占），却不做 size-limit（快 + 稳，最该做的没做）。

### 7.4 Monorepo 的额外考虑

```yaml
# 只对受影响的包跑性能检查，避免 CI 时长爆炸
      - name: Check size limit for changed packages
        run: npx turbo run size --filter='...[origin/main]'
```

原则：**性能检查的粒度要跟包的粒度对齐**。整仓跑一遍 Lighthouse 在 Monorepo 里几乎不可持续，必须靠受影响范围（affected）裁剪。

---

## 八、超标之后怎么办：流程设计

技术配置只是一半。**没有例外机制的硬卡口，最终一定会被绕过**——这是这一节存在的全部理由。

### 8.1 为什么必须有例外机制

考虑一个真实场景：法务要求本周内上线一个第三方合规 SDK，它有 80KB，预算只剩 10KB。

```
没有例外机制时会发生什么：
        │
        ├──▶ 方案 A：熬夜优化别的地方腾出 70KB —— 时间不允许
        ├──▶ 方案 B：默默把 limit 从 230 kB 改成 310 kB，PR 里不提 —— 最常见 ✗
        ├──▶ 方案 C：把 size job 设成 continue-on-error —— 卡口永久失效 ✗✗
        └──▶ 方案 D：找有权限的人强制合入 —— 先例一开，后面都这么干 ✗✗✗

结局：预算数字还在配置文件里，但已经没有约束力了
```

**堵死所有正当出口，只会催生不正当出口。** 例外机制不是给卡口开后门，而是把「必然会发生的放宽」纳入可见、可追溯、可回收的流程。

### 8.2 三种超标处理路径

| 路径 | 适用情形 | 动作 | 需要谁批准 |
| --- | --- | --- | --- |
| **A. 修** | 大多数情况：误引依赖、该懒加载没懒加载、图片没压 | 按 4.5 的归因表处理，改到达标 | 无需批准，正常 review |
| **B. 临时豁免** | 有明确期限的特殊情况（大促活动脚本、临时兜底代码） | 加豁免标记 + **必须写失效日期** + 建 TODO 跟踪 | 1 名性能 owner |
| **C. 永久提额** | 业务确实扩张，旧预算已不合理（新增了整个模块） | 改配置里的数字 + PR 里说明理由与新基线 | 性能 owner + 技术负责人 |

关键区别：**B 有期限，C 没有**。混淆这两者是流程腐化的开始——所有的 B 都会悄悄变成 C。

### 8.3 豁免的正确写法

```json
{
  "size-limit": [
    {
      "name": "主入口（首屏必需）",
      "path": "dist/assets/index-*.js",
      "limit": "230 kB",
      "gzip": true
    },
    {
      "name": "主入口 - 临时豁免至 2026-10-01",
      "_comment": "合规 SDK xxx-compliance 占 78kB，法务要求 Q3 内上线；SDK 团队承诺 Q4 提供 lite 版本后回收本豁免。跟踪 issue: #4821，审批人：@perf-owner @tech-lead",
      "path": "dist/assets/index-*.js",
      "limit": "310 kB",
      "gzip": true
    }
  ]
}
```

一个合格的豁免必须包含四要素，缺一不可：

| 要素 | 作用 | 缺失后果 |
| --- | --- | --- |
| **原因** | 说清为什么非要超 | 半年后没人知道这 80KB 是什么，不敢删 |
| **失效日期** | 让豁免会「过期」 | 临时豁免变永久，预算文件里堆满历史包袱 |
| **跟踪 issue** | 有地方推进回收 | 没有人负责，永远不会被处理 |
| **审批人** | 明确责任 | 谁都能加豁免，卡口失去权威 |

> 💡 进阶做法：把「有效期已过的豁免」本身做成一条 CI 检查。定时任务扫描配置里的失效日期，过期就开 issue @上审批人。**让流程自己有牙齿，而不是靠人记得。**

### 8.4 预算值本身多久 review 一次

预算数字不是刻在石头上的。它需要定期校准，否则会往两个方向失效：

| 失效方向 | 表现 | 后果 |
| --- | --- | --- |
| **太松** | 预算 500KB，实际长期在 230KB | 卡口从不触发，等于没有；而且给了虚假安全感 |
| **太紧** | 业务已经扩张三倍，预算还是老数字 | 每个 PR 都要走豁免流程，团队开始厌恶卡口 |

推荐节奏：

| 时机 | 动作 |
| --- | --- |
| **每季度** | 对齐一次实际值：如果实际长期低于预算 20% 以上，**把预算收紧到实际值 + 10%** |
| **每次专项优化后** | 立刻把预算下调到新水位。**这是整套机制的闭环**——不下调，优化成果就没有被锁定，等于白干 |
| **业务形态变化时** | 新增大模块、改技术栈、换 UI 库，重新评估并说明 |
| **切换测量口径时** | gzip↔brotli、simulated↔devtools 节流，所有数字必须重设 |

「优化后立刻收紧预算」这条最重要，它直接回应第一章的问题：

```
❌ 只优化不收紧
  LCP 3.8s ──优化──▶ 1.5s   预算仍是 3.8s
                              ⇒ 从 1.5 涨回 3.7 全程无人拦  ⇒ 半年后回到原点

✅ 优化后收紧预算
  LCP 3.8s ──优化──▶ 1.5s   预算同步改为 1.7s
                              ⇒ 涨到 1.75s 就被拦下  ⇒ 成果被锁定
```

### 8.5 谁来 owner 这件事

| 角色 | 职责 |
| --- | --- |
| **性能 owner（1 人，可轮值）** | 审批豁免、季度校准预算、看趋势周报、追回收 |
| **PR 作者** | 自己的 PR 超标自己处理，不甩给 owner |
| **技术负责人** | 审批永久提额，裁决「优化 vs 业务节奏」的冲突 |

> ⚠️ 最容易失败的组织形态是「谁都负责」= 谁都不负责。必须有一个具名的人对预算数字负责，否则第 8.4 的季度 review 永远不会发生。

---

## 九、真实用户数据侧的预算

### 9.1 Lab 达标 ≠ Field 达标

Lighthouse CI 给的是**实验室数据（Lab Data）**：一台固定配置的机器、一次干净的加载、模拟的网络。真实用户是另一个世界。

| | 实验室数据（Lab） | 真实用户数据（Field / RUM） |
| --- | --- | --- |
| **采集方式** | CI 或本地跑 Lighthouse | 用户浏览器上报 |
| **设备** | 单一模拟配置 | 从旗舰机到五年前的千元机 |
| **网络** | 固定节流参数 | 地铁弱网、公司 WiFi、5G |
| **缓存状态** | 通常冷启动 | 大量是热缓存二次访问 |
| **交互路径** | 只有加载 | 真实点击、滚动，INP 只有这里能测准 |
| **数据量** | 1 次 × N 轮 | 每天数万到千万次 |
| **能否归因到代码** | ✅ 有完整 trace | ⚠️ 只有聚合指标，需自建归因 |
| **能否做 PR 卡口** | ✅ 能（这是它唯一优势） | ❌ 不能，数据在上线后才有 |
| **能否代表用户体验** | ❌ 不能 | ✅ 能 |

典型的背离场景：

- **CI 全绿，线上 P75 LCP 4s**：CI 测的是首页冷启动，用户实际入口是带大量查询参数的详情页
- **CI 的 CLS 是 0，线上 0.25**：CI 里广告位没有加载，真实用户那里广告插入导致大幅偏移
- **CI 没有 INP 数据**：INP 需要真实交互，Lighthouse 只能给 TBT 作为代理指标

结论：**Lab 用来防退化（快、可卡口），Field 用来做验收（真、但滞后）**。两者不能互相替代，缺任一层都不完整。

### 9.2 为什么用 P75

Core Web Vitals 的官方口径是**第 75 百分位（P75）**——即 75% 的访问都优于这个值。

| 统计口径 | 问题 | 是否 CWV 口径 |
| --- | --- | --- |
| **平均值（mean）** | 被极端长尾拉偏；且「平均体验」在真实分布里往往不存在 | ❌ |
| **P50（中位数）** | 一半用户的体验被完全忽略，太宽松 | ❌ |
| **P75** | 覆盖大多数用户，同时不被极端长尾（断网、超低端机）绑架 | ✅ **官方口径** |
| **P95 / P99** | 主要反映极端设备与网络，优化投入产出比极低 | ❌ |

选 P75 的逻辑是一个权衡：

```
用户体验分布（LCP）
      │
 用户数│        ██
      │      ██████
      │    ██████████
      │  ██████████████
      │ ████████████████████
      │██████████████████████████████
      └──┬────┬────┬────┬────┬────┬───▶ LCP
        1s   2s  2.5s  4s   8s  30s
                  ▲          ▲
                 P75        P95
             「大多数人的      「极端设备/断网」
              体验下限」       优化性价比极低

P50 太宽松：一半用户被忽略
P95 太苛刻：为 5% 的极端场景付出不成比例的成本
P75 = 「绝大多数用户不该忍受的下限」
```

补充两点常被问到的细节：

1. **CWV 的达标要求是三项同时达标**：P75 的 LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1，任一项不达标即整体不达标。
2. **INP 自身的计算也是分位数**（单页面取第 98 百分位的交互），然后再在用户维度取 P75——这是两层分位数，容易答错。

### 9.3 CrUX 与自建 RUM 的分工

| | CrUX（Chrome UX Report） | 自建 RUM |
| --- | --- | --- |
| **数据来源** | Chrome 真实用户匿名汇总 | 自己页面里的采集脚本 |
| **接入成本** | 零，本来就有 | 需要开发采集与后端存储 |
| **覆盖范围** | 只有 Chrome，且要求页面有足够流量 | 全部访问，包括内网系统、低流量页面 |
| **数据延迟** | 28 天滚动窗口，天级更新 | 可做到分钟级 |
| **维度拆分** | 有限（设备、有效网络类型、国家） | ✅ 任意维度：版本号、路由、AB 分组、用户群 |
| **能否定位到代码** | ❌ 不能 | ✅ 能，可带元素选择器、脚本归因 |
| **能否用于内网系统** | ❌ 流量不足或不被收录 | ✅ 唯一可行方案 |
| **权威性** | ✅ 官方口径，Search Console 用的就是它 | 口径需自己对齐 |

实践组合：**CrUX 作为对外权威口径的对账，自建 RUM 作为日常归因与告警**。

CrUX 的快速查询方式：

```bash
# PageSpeed Insights 页面直接看 "Discover what your real users are experiencing"
# 或用 CrUX API（需申请 key）
curl -X POST \
  "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=$CRUX_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{ "origin": "https://example.com", "formFactor": "PHONE" }'
```

自建 RUM 的采集口径要点：

```js
import { onLCP, onINP, onCLS } from 'web-vitals';

// ✅ 上报时必须带上能做分位数聚合与归因的维度
function report(metric) {
  navigator.sendBeacon(
    '/api/rum',
    JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // good / needs-improvement / poor
      id: metric.id,         // 同一次访问的去重键
      // 归因维度：缺了这些，线上数据只能告诉你「慢」，不能告诉你「哪慢」
      route: location.pathname,
      release: __APP_VERSION__,
      // 设备与网络画像，用于区分「代码变慢」和「用户设备变差」
      deviceMemory: navigator.deviceMemory,
      effectiveType: navigator.connection?.effectiveType,
    }),
  );
}

onLCP(report);
onINP(report);
onCLS(report);
```

> 💡 完整的采集器实现（上报时机、`sendBeacon` 的选择、bfcache 重复上报、SPA 路由切换下的指标重置、采样策略）见 [Performance API 全解](../08-网络与浏览器/性能优化/Performance-API全解.md) 第九章。本篇只讲**怎么把这些数据变成预算与卡口**。

### 9.4 把 RUM 数据变成预算

RUM 侧的预算和 CI 侧的形态不同：**它不阻断 PR，它触发告警与回滚**。

| 预算项 | 阈值示例 | 触发动作 |
| --- | --- | --- |
| P75 LCP | ≤ 2.5s | 超出 → 告警到值班群 |
| P75 INP | ≤ 200ms | 超出 → 告警 |
| P75 CLS | ≤ 0.1 | 超出 → 告警 |
| **CWV 三项全绿的页面占比** | ≥ 80% | 下降 → 排期专项 |
| **发布后 30 分钟内 P75 LCP 涨幅** | ≤ 10% | 超出 → 触发回滚评估 |

最后一条最有价值：**按 release 版本切分的 RUM 指标，是唯一能发现「CI 全绿但线上变慢」的手段**。CI 只能测你想到要测的页面和路径，RUM 覆盖全部真实路径。

### 9.5 四层防线的完整闭环

```
   开发本地              PR CI                 主干/巡检              线上 RUM
      │                    │                      │                    │
   构建工具提示      size-limit（error）    Lighthouse CI（warn）   P75 CWV 达标率
   chunk 胖了        体积硬卡口              时间趋势 + 基线         真实用户验收
      │                    │                      │                    │
   ▼ 最快最便宜        ▼ 能拦住退化          ▼ 能看见趋势          ▼ 最真但最滞后
      └────────────────────┴──────────────────────┴────────────────────┘
                                    │
                      RUM 发现退化 → 反查是哪个 release
                                    │
                      → 该退化为什么没被 CI 拦住？
                                    │
                      → 补一条 CI 断言 / 补测一个页面
                                    │
                            ▲ 闭环在这里 ▲
```

关键在最后那个反向箭头：**每一次线上退化都应该产出一条新的 CI 断言**。否则同类问题会反复发生。这和「每修一个 bug 补一个回归测试」是同一个方法论。

---

## 十、常见踩坑与落地清单

### 10.1 常见踩坑表

| 现象 | 根因 | 解法 |
| --- | --- | --- |
| `budgetsFile` 配了但 `preset`/`assertions` 全部失效 | ⚠️ **`budgetsFile` 与其他任何 assert 选项互斥** | 二选一；要共存就改用 `assertions` 里的 `resource-summary:<type>:(size\|count)` |
| 阈值差了约 1024 倍，卡口形同虚设或全红 | ⚠️ **单位不一致**：`assertions` 的 `maxNumericValue` 用**字节**，`budget.json` 用 **KB** | 230KB 在 `assertions` 写 `230000`，在 `budget.json` 写 `230` |
| 以为「跑 5 次取中位数」，实际卡口很松 | 断言默认 `aggregationMethod: "optimistic"`，取最有利的一次 | 时间类显式写 `aggregationMethod: 'median'` |
| Monorepo 子包里跑 `lhci` 说找不到配置 | 配置查找**不向上级目录递归** | 子包内放配置，或用 `--config=../../lighthouserc.js` |
| `lhci autorun` 的 flag 不生效 | `autorun` 下子命令 flag 必须用 `=` 形式 | `--collect.numberOfRuns=5`，不要用空格 |
| 时间类断言天天红，团队开始 re-run | 用 error 卡了会抖 30% 的指标，假失败率高 | 降为 `warn`；要卡就先上专用 runner + `numberOfRuns` + `median` |
| CI 里 Chrome 起不来 / 崩溃 | 容器内缺少沙箱权限、`/dev/shm` 太小 | `chromeFlags: '--no-sandbox --disable-dev-shm-usage'` |
| `startServerCommand` 一直超时 | 就绪判定正则不匹配，或默认 10s 不够 | 配 `startServerReadyPattern` + 调大 `startServerReadyTimeout` |
| 纯静态站点接入很别扭 | 用了 `startServerCommand` 而非 `staticDistDir` | 静态产物直接用 `collect.staticDistDir` |
| SPA 路由页测出来全是空白页指标 | 没开 `isSinglePageApplication` | `collect.isSinglePageApplication: true` |
| 报告链接过几天全部 404 | `temporary-public-storage` **几天后自动清除** | 内部项目改用自建 LHCI Server 或 `filesystem` |
| 内部页面报告被外部访问到 | `temporary-public-storage` **任何拿到链接的人都能访问** | 内部项目禁用该 target |
| 改用 `filesystem` 后 PR 里点不进报告 | `filesystem` **失去 GitHub 详细状态检查能力** | 自建 Server，或额外用 artifact 上传兜底 |
| 体积预算数字异常大 | `path` glob 把 `*.map` 也算进去了 | 收窄 glob；webpack 用 `performance.assetFilter` 过滤 |
| 优化专项做完，半年后又退回去 | **优化后没有同步收紧预算** | 每次专项结束立刻下调预算到新水位 |
| 总量预算过了但首屏变慢 | 只设了总量，没有按入口分别设限 | 首屏入口单独设严格预算 + 汇总兜底 |
| 一夜之间体积「瘦了 18%」 | 悄悄从 gzip 口径改成 brotli | 切口径必须重设所有数字并公示 |
| pre-commit 被全员 `--no-verify` | 把需要完整构建的检查放进了 pre-commit | 性能检查移到 PR CI，pre-commit 只留秒级检查 |
| 调大 `chunkSizeWarningLimit` 就「解决」了体积问题 | 它只是警告，不是卡口 | 硬卡口交给 `size-limit` |
| 换了节流方式后历史数据全部对不上 | `simulated` 与 `devtools` 是两把不同的尺子 | 切换后重建基线，不与历史混比 |
| CI 全绿但线上 CWV 不达标 | 只有 Lab 数据，缺 Field 验收 | 补 CrUX / 自建 RUM 的 P75 口径 |
| 只在 PR 跑 LH，趋势图永远是空的 | 主干没跑，没有基线数据点 | `push: main` 也跑一遍并 upload |

### 10.2 落地清单

**Must（不做会直接导致卡口失效或缺失）**

- [ ] 接入 `size-limit`，至少覆盖首屏入口，级别 error — 不做则**没有任何能真正拦住退化的门禁**，全篇立论落空
- [ ] 按入口分别设限，而非只设一个总量 — 不做则首屏膨胀会被懒加载包的瘦身掩盖，卡口失效
- [ ] 体积口径与线上 CDN 实际压缩算法一致（gzip 或 brotli 二选一，全仓统一）— 不做则预算数字与真实传输量脱节，形同虚设
- [ ] 提交 lockfile，CI 用 `npm ci` / `--frozen-lockfile` — 不做则依赖版本漂移导致体积基线不可复现
- [ ] 所有时间类断言设为 `warn`，不设 error — 不做则假失败率高，团队会整体绕过卡口（见 3.3）
- [ ] PR 里能看到体积**变化量**（不只是超没超）— 不做则累积退化依然不可见，code review 仍然拦不住
- [ ] 建立豁免机制：原因 + 失效日期 + 跟踪 issue + 审批人四要素 — 不做则超标者只能走「悄悄改数字」或「强制合入」，卡口权威崩塌
- [ ] 指定具名的性能 owner — 不做则季度校准永远不会发生，预算逐年失真

**Should（不做会显著降低效果）**

- [ ] 接入 Lighthouse CI，时间类 warn + 体积类 error 分级 — 不做则只能防「变胖」，防不住「同样体积却变慢」
- [ ] `collect.numberOfRuns` ≥ 3，时间类断言显式配 `aggregationMethod: 'median'` — 不做则数据是单次噪声，且默认 `optimistic` 会让卡口比预期宽松
- [ ] 固定 `throttling` / `formFactor` / `screenEmulation` 参数 — 不做则指标随 runner 机型漂移，历史数据不可比
- [ ] 主干 push 也跑 LH 并 upload — 不做则没有基线，PR 报告无法判断「是噪声还是退化」
- [ ] 自建 LHCI Server 保存历史 — 不做则看不见趋势曲线，只能看见孤立的点（见 5.8）
- [ ] 内部项目禁用 `temporary-public-storage` — 不做则内部页面报告公开可访问，且几天后数据消失
- [ ] 每次性能专项结束后同步收紧预算 — 不做则优化成果没有被锁定，等于白干
- [ ] 接入 RUM，按 P75 统计 CWV 三项 — 不做则无法发现「CI 全绿但线上变慢」
- [ ] 性能检查全部移出 pre-commit — 不做则开发学会 `--no-verify`，连带毁掉 lint 等其他检查

**Could（有余力再做）**

- [ ] 构建工具内置预算（`performance.maxEntrypointSize` / `chunkSizeWarningLimit`）作为本地提醒 — 不做只是少一层左移提示，不影响门禁
- [ ] `assertMatrix` 做多页面差异化预算 — 不做则只能用一套预算，首页与后台页被同等对待
- [ ] 定时巡检（`numberOfRuns` 更高、多机型多网络）— 不做则缺少高精度趋势周报
- [ ] 豁免过期自动开 issue 的定时任务 — 不做则回收靠人记得，临时豁免大概率变永久
- [ ] Monorepo 用 affected 裁剪性能检查范围 — 不做则 CI 时长随包数量线性膨胀
- [ ] `user-timings:<name>` 断言业务自定义打点 — 不做则只能卡通用指标，卡不住业务关键节点
- [ ] CrUX API 对账 + 竞品对比 — 不做则缺少对外权威口径的校验

---

## 面试高频问答 🎯

### Q1：你把首屏从 3.8s 优化到 1.5s，怎么保证半年后不会退化回去？

靠人肯定不行，必须做自动化卡口。我的判断是**性能退化是累积的而不是单点的**：每个 PR 只加 8KB、慢 20ms，单看都完全合理，code review 里没人有立场反对，但半年累积下来就能吃掉两周的优化成果。所以人工评审天然拦不住它，只能靠机器每次算总量。

具体做三件事。第一，**优化结束后立刻把性能预算下调到新水位**，比如预算从 3.8s 改成 1.7s——这一步最关键，不收紧预算等于优化成果没被锁定。第二，**PR CI 上加体积硬卡口**，我会用 size-limit 按入口分别设限，超标直接红，并且在 PR 里评论出体积变化量，让「涨了 13KB」这件事对所有人可见。第三，**Lighthouse CI 放在主干和定时巡检**，配 LHCI Server 存历史，看的是趋势曲线而不是单点值，因为腐化是一条缓坡，单点断言看不出斜率。

最后线上补 RUM 的 P75 达标率做验收，每次线上退化都反过来补一条 CI 断言，形成闭环。

### Q2：性能预算有哪几类？哪类适合做硬卡口？

三类。**数量型**是资源体积和请求数，读构建产物就能算；**时间型**是 LCP、TBT、TTI，必须真实加载页面才能测；**规则型**是 Lighthouse 分数、CWV 达标率这种聚合评价。

选卡口的判断依据不是「哪个指标更重要」，而是**同一份代码跑两次结果会不会变**。数量型的确定性极高，同一个产物永远是同一个数字，零假失败，所以适合设 error 做硬卡口。时间型在 CI 上波动能到 30%，硬卡必然误伤，只适合设 warn 观察趋势。规则型的分数是由时间指标折算的，同样会抖，也建议 warn；但里面的 Accessibility、SEO 这些静态规则判定是稳定的，可以 error。

要强调的是三者互补不能互相替代。体积不涨不等于不会变慢——同样 200KB 的 JS，首屏同步执行和空闲时懒加载，对 TBT 的影响完全不同。所以体积卡口必须配时间类观察。

### Q3：CI 里的时间类指标不稳定，你怎么处理？

先承认这个客观事实：CI runner 是共享虚拟机，同宿主上别的 job 在编译，你的 Chrome 抢不到 CPU，机型还可能跨代际。同一个 commit 连续跑两次 LCP 差 30% 是常态，TBT 波动更大。

处理上分两层。**认知层面**，我会明确「CI 的时间指标只能看趋势，不能当绝对判据」，所以一律设 warn。这背后有个团队协作的道理：假失败会摧毁卡口的公信力。如果 20% 的 PR 被无辜拦住，开发第一反应是 re-run，接着「这检查经常误报」成为共识，然后就是 `--no-verify`、continue-on-error，卡口名义存在实际永久绿灯——那时候真实退化亮红灯也没人看了。所以设计原则是宁可少拦不可错拦。

**技术层面**有三个手段，成本递增：`numberOfRuns` 提到 3 到 5 次采样，并且断言里显式写 `aggregationMethod: 'median'`——这点很容易漏，默认值是 optimistic 取最好的一次，会让卡口比你预期宽松得多；然后固定 throttling 和 screenEmulation 参数，不固定就等于指标跟着机型漂移；最彻底的是上专用 runner 不与构建混跑。另外真正有用的是相对基线，靠 LHCI Server 和目标分支 diff，「涨了 680ms」比「2680 超了 2500」有说服力得多。

### Q4：size-limit 和 Lighthouse CI 分别解决什么问题？为什么体积卡口要放前面？

size-limit 解决「变胖」，Lighthouse CI 解决「变慢」，职责不同不能互替。

体积卡口放第一道防线有三个理由。**快**：读构建产物，秒级出结果，Lighthouse 要真实加载还要跑多轮，是分钟级。**稳**：同一个产物永远同一个数字，假失败率是零，这直接决定了它能设 error 而 Lighthouse 不能。**归因明确**：`size-limit --why` 能直接指到是哪个依赖变大了，开发拿到就知道怎么改；时间类指标超标往往得看 trace 才知道原因。

一个常见的错误是把优先级搞反了——把 Lighthouse CI 设成 PR 阻断，慢和抖两头不占，反而不做 size-limit。我的接入顺序是先在 CI 里加 `npm run build && npx size-limit` 两行，把最确定的体积卡住，让团队建立「这个红灯亮了一定是真问题」的条件反射，然后再上 Lighthouse CI 做观察层。

配置上还有个细节：必须**按入口分别设限**，不能只设总量。只设总量的话，首屏入口从 180KB 涨到 260KB、后台页瘦身 80KB，总量没变卡口就过了，但首屏实际慢了一大截。

### Q5：Lighthouse 分数达标了，为什么线上真实用户的 Core Web Vitals 还是不达标？

因为 Lighthouse 是实验室数据（Lab），单一模拟设备、固定节流、通常还是冷启动首页；真实用户是全设备全网络的分布，入口可能是带一堆参数的详情页。常见背离有几种：CI 测首页但用户主要访问详情页；CI 里广告位没加载所以 CLS 是 0，线上广告插入导致大幅偏移；还有 INP 这种必须靠真实交互才能测的指标，Lighthouse 只能给 TBT 作为代理。

所以最终验收口径必须回到真实用户数据，用 **P75** 统计 LCP ≤ 2.5s、INP ≤ 200ms、CLS ≤ 0.1 三项，且要求三项同时达标。用 P75 是官方口径，逻辑是个权衡：平均值被长尾拉偏，P50 忽略了一半用户太宽松，P95、P99 主要反映断网和极端低端机，优化性价比极低；P75 代表「绝大多数用户不该忍受的下限」。

数据来源上，CrUX 是官方权威口径可以对账，但只有 Chrome、要求页面有足够流量、28 天滚动窗口延迟大，内网系统根本收录不到。所以日常还得靠自建 RUM，用 `web-vitals` 库采集，上报时一定要带 route、release 版本、设备内存、网络类型这些维度——按 release 切分的指标是唯一能发现「CI 全绿但线上变慢」的手段。发现之后再反过来补一条 CI 断言，这才是完整闭环。

---

## 相关笔记

- [CI/CD 持续集成与部署](./CI-CD持续集成与部署.md) — CI 流水线全貌与 GitHub Actions 基础，其「前端 CI 常见检查项」里的包体积检查与 Lighthouse CI 两条，本篇是完整展开
- [前端测试体系与质量门禁](./前端测试体系与质量门禁.md) — 质量门禁的整体设计（静态检查 / 单测 / 组件 / E2E 分层）。分工：那篇管**功能正确性**的门禁，本篇管**性能不退化**的门禁；两篇的分环节原则一致（本地求快、PR 求准、主干求稳）
- [构建产物分析与发布策略](./构建产物分析与发布策略.md) — 产物构成分析与拆包策略，是体积预算超标后的具体优化手段
- [Webpack 性能优化实战](./Webpack性能优化实战.md) — `performance` 配置所在的优化体系，以及拆包、tree-shaking 的落地
- [Vite 原理与配置实战](./Vite原理与配置实战.md) — `build.chunkSizeWarningLimit` 所属的构建配置体系
- [包管理与依赖治理](./包管理与依赖治理.md) — 依赖膨胀的治理，对应体积超标最常见的根因
- [Monorepo 实战指南](./Monorepo实战指南.md) — 多包场景下用 affected 裁剪性能检查范围
- [DevTools Performance 面板实操](../08-网络与浏览器/性能优化/DevTools-Performance面板实操.md) — 分工：那篇是**手动排查**，回答「具体哪一行代码慢」；本篇是**自动化防退化**，回答「怎么保证不再变慢」。卡口告警之后用那篇的方法归因
- [Performance API 全解](../08-网络与浏览器/性能优化/Performance-API全解.md) — 分工：那篇讲 RUM 采集的**实现**（采集器、上报时机、采样、SPA 指标重置），本篇讲采集到的数据怎么变成**预算与告警口径**
- [Web Vitals：INP 指标详解](../08-网络与浏览器/性能优化/Web%20Vitals与INP指标详解.md) — INP 的定义、分位数口径与优化手段，是本篇 P75 验收标准的指标侧基础
- [前端性能优化全景](../08-网络与浏览器/性能优化/前端性能优化全景.md) — 优化手段总览，本篇负责的是这些手段做完之后如何守住
- [前端性能优化完全指南](../11-项目实战/前端性能优化完全指南.md) — 分层优化正典
- [前端性能优化实战清单](../11-项目实战/前端性能优化实战清单.md) — 可执行的优化条目清单
- [课程笔记-第 20 讲：如何进行性能分析的自动化实现](../10-Git与工具/课程笔记/课程笔记-第20讲：如何进行性能分析的自动化实现.md) — Lighthouse 内部架构与 Chrome DevTools Protocol 自动化原理
- [七、CI-CD 与 Monorepo（牛客面试题）](../13-前端面试题/牛客网-面试题-工程化/07-七、CI-CD-与-Monorepo.md) — CI/CD 面试题合集，其中 Lighthouse CI 接入的简答题在本篇有完整展开
