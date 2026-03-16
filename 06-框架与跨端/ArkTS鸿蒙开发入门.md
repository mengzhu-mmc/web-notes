# ArkTS 鸿蒙开发入门

> 面向前端开发者的 HarmonyOS ArkTS 快速上手笔记，重点对比 React / Vue 的异同。

---

## 一、ArkTS 是什么

ArkTS 是华为在 TypeScript 基础上扩展的语言，用于 HarmonyOS 的 ArkUI 框架开发原生应用。它去掉了 JS 的大量动态特性（禁止随意改变对象结构、限制 `any` 类型），强制静态类型，目的是让编译器做更多优化，同时保证运行安全。

写法风格上更接近 **SwiftUI / Jetpack Compose**，而不是 React / Vue。

---

## 二、与 React / Vue 的核心区别

| 对比项 | React | Vue | ArkTS |
|---|---|---|---|
| 响应式原理 | 重新执行函数 + vdom diff | Proxy 响应式 | 装饰器 + 编译时依赖分析 |
| 有无 Virtual DOM | 有 | 有 | **无** |
| 运行环境 | 浏览器 | 浏览器 | HarmonyOS |
| UI 描述方式 | JSX | 模板语法 | `build()` 链式调用 |
| 语言 | JS/TS + JSX | JS/TS + 模板 | ArkTS（严格 TS 超集） |
| 类比 | - | - | SwiftUI / Compose |

**响应式机制**：ArkTS 用 `@State` 等装饰器代理变量，编译时分析依赖关系，状态变化时**精准更新对应 UI 节点**，不会重新执行整个 `build()` 函数。这一点和 Vue 的 Proxy 响应式更像，和 React 重新执行函数组件的思路相反。

**系统能力**：ArkTS 可以调用鸿蒙系统 API（蓝牙、摄像头、传感器、分布式能力等），这是 Web 框架做不到的。同一套代码可适配手机、平板、手表、车机等多设备（"一多"理念）。

---

## 三、基础语法

### 3.1 组件结构

```typescript
@Entry        // 页面入口组件（每个页面只有一个）
@Component    // 声明这是一个 ArkUI 组件
struct Counter {
  @State count: number = 0   // 响应式状态

  build() {
    // build() 描述 UI 结构，类似 render()
    Column() {
      Text(`Count: ${this.count}`)
        .fontSize(24)
        .fontColor('#333')

      Button('点击 +1')
        .width(120)
        .height(40)
        .onClick(() => {
          this.count++
        })
    }
    .padding(20)
    .width('100%')
  }
}
```

- `@Entry`：标记页面入口，一个页面只能有一个
- `@Component`：标记这是一个组件
- `struct`：ArkTS 用结构体定义组件，不是 class 也不是 function
- `build()`：描述 UI 的方法，类似 React 的 `return JSX`
- 布局和样式通过**链式调用**设置，不是 CSS

### 3.2 常用布局组件

```typescript
// 垂直排列（类似 flex-direction: column）
Column() {
  Text('第一行')
  Text('第二行')
}

// 水平排列（类似 flex-direction: row）
Row() {
  Text('左')
  Text('右')
}

// 层叠布局（类似 position: absolute 叠加）
Stack() {
  Image($r('app.media.bg'))
  Text('叠加文字')
}

// 列表（类似 FlatList / v-for）
List() {
  ForEach(this.items, (item: string) => {
    ListItem() {
      Text(item)
    }
  })
}
```

### 3.3 状态装饰器

| 装饰器 | 作用 | 类比 |
|---|---|---|
| `@State` | 组件内部私有状态 | `useState` / `ref` |
| `@Prop` | 父传子，单向，子不能改 | React props（只读） |
| `@Link` | 父子双向绑定 | Vue `v-model` |
| `@Observed` + `@ObjectLink` | 嵌套对象深层响应式 | Vue 深层响应式 |
| `@Provide` / `@Consume` | 跨层级传递 | React Context |
| `@StorageLink` | 绑定 AppStorage 全局状态 | Redux / Pinia |

```typescript
// 父组件
@Component
struct Parent {
  @State message: string = 'Hello'

  build() {
    Column() {
      Child({ msg: this.message })         // @Prop 单向
      ChildLink({ msg: $message })         // @Link 双向，注意用 $ 传引用
    }
  }
}

// 子组件 - 单向
@Component
struct Child {
  @Prop msg: string = ''

  build() {
    Text(this.msg)
  }
}

// 子组件 - 双向
@Component
struct ChildLink {
  @Link msg: string

  build() {
    TextInput({ text: this.msg })
      .onChange((val) => { this.msg = val })
  }
}
```

### 3.4 生命周期

```typescript
@Entry
@Component
struct MyPage {
  aboutToAppear() {
    // 组件创建后，build() 执行前
    // 类似 Vue 的 onMounted / React 的 useEffect(() => {}, [])
    console.log('页面出现')
  }

  aboutToDisappear() {
    // 组件销毁前
    // 适合清理定时器、取消订阅
    console.log('页面消失')
  }

  onPageShow() {
    // 页面每次显示时触发（包括从后台切回来）
  }

  onPageHide() {
    // 页面隐藏时触发
  }

  build() {
    Text('Hello')
  }
}
```

---

## 四、页面跳转与路由

### 4.1 router（旧方案）

```typescript
import router from '@ohos.router'

// 跳转并传参
router.pushUrl({
  url: 'pages/Detail',
  params: { id: 123, name: '商品A' }
})

// 返回上一页
router.back()

// 目标页接收参数
@Entry
@Component
struct Detail {
  private params = router.getParams() as { id: number, name: string }

  build() {
    Text(`商品：${this.params.name}`)
  }
}
```

### 4.2 Navigation（新方案，HarmonyOS 4+ 推荐）

```typescript
// 大屏自动变成左右分栏，更适合多设备适配
@Entry
@Component
struct Index {
  @State pageStack: NavPathStack = new NavPathStack()

  build() {
    Navigation(this.pageStack) {
      Button('去详情页')
        .onClick(() => {
          this.pageStack.pushPathByName('Detail', { id: 1 })
        })
    }
    .title('首页')
  }
}
```

---

## 五、跨页面数据传递

### 5.1 路由传参（单次跳转）

适合：页面跳转时携带少量数据，单向传递。

```typescript
// 发送
router.pushUrl({ url: 'pages/B', params: { userId: 1 } })

// 接收
const params = router.getParams() as { userId: number }
```

### 5.2 AppStorage（全局状态）

适合：登录信息、用户配置、主题等整个 App 共享的数据。

```typescript
// 任意位置写入
AppStorage.setOrCreate('token', 'abc123')

// 组件中响应式读取（双向绑定）
@StorageLink('token') token: string = ''

// 单向读取
@StorageProp('token') token: string = ''
```

### 5.3 LocalStorage（页面级共享）

适合：只在某几个页面间共享，不污染全局。

```typescript
let storage = new LocalStorage({ count: 0 })

@Entry(storage)
@Component
struct PageA {
  @LocalStorageLink('count') count: number = 0
  // ...
}
```

### 5.4 EventHub（事件总线）

适合：非父子关系的页面间发消息通知，松耦合。

```typescript
// 发送事件
getContext(this).eventHub.emit('refresh', { type: 'list' })

// 监听事件
aboutToAppear() {
  getContext(this).eventHub.on('refresh', (data) => {
    console.log(data.type)
  })
}

// 取消监听（必须在 aboutToDisappear 中清理）
aboutToDisappear() {
  getContext(this).eventHub.off('refresh')
}
```

**选型建议**：

- 页面跳转传参 → 路由 params
- 全局共享（登录态、主题）→ AppStorage
- 局部几个页面共享 → LocalStorage
- 松耦合事件通知 → EventHub

---

## 六、网络请求

```typescript
import http from '@ohos.net.http'

async function fetchData() {
  const httpRequest = http.createHttp()

  const response = await httpRequest.request(
    'https://api.example.com/data',
    {
      method: http.RequestMethod.GET,
      header: { 'Content-Type': 'application/json' }
    }
  )

  if (response.responseCode === 200) {
    const data = JSON.parse(response.result as string)
    console.log(data)
  }

  httpRequest.destroy()
}
```

---

## 七、面试高频考点

**Q：ArkTS 的响应式原理是什么？**

编译时分析 `@State` 等装饰器标记的变量与 UI 节点的依赖关系，运行时当状态变化时精准更新对应节点，不走 Virtual DOM diff，也不重新执行整个 `build()` 函数。

**Q：`@Prop` 和 `@Link` 的区别？**

`@Prop` 是父到子的单向数据流，子组件修改不会影响父组件；`@Link` 是双向绑定，子组件修改会同步到父组件，传递时需要用 `$` 符号传引用。

**Q：ArkTS 和 React/Vue 最大的区别？**

运行环境不同（原生 OS vs 浏览器），没有 Virtual DOM，响应式原理是编译时依赖分析而非 vdom diff，能调用系统级 API，支持多设备适配。

**Q：AppStorage 和 LocalStorage 的区别？**

AppStorage 是应用级全局存储，整个 App 生命周期共享；LocalStorage 作用域更小，可以限定在某几个页面之间，避免全局污染。
