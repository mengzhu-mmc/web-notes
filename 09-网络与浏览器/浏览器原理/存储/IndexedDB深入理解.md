# IndexedDB 深入理解

## 面试高频考点

- IndexedDB 是什么？和 LocalStorage 有什么区别？
- IndexedDB 的核心概念有哪些（数据库/对象仓库/索引/事务）？
- IndexedDB 的基本增删改查怎么写？
- IndexedDB 有哪些实际应用场景？
- 如何封装 IndexedDB 让它更好用？

---

## 一、为什么需要 IndexedDB？

LocalStorage 只有 5MB，只能存字符串，没有查询能力。当前端需要存储大量结构化数据时（离线应用、大文件缓存、复杂查询），就需要 IndexedDB。

| 特性 | Cookie | LocalStorage | SessionStorage | IndexedDB |
|------|--------|--------------|----------------|-----------|
| 存储大小 | ~4KB | ~5MB | ~5MB | **数百MB~GB级** |
| 数据类型 | 字符串 | 字符串 | 字符串 | **任意JS对象**（含File/Blob） |
| 查询能力 | ❌ | ❌ | ❌ | ✅ **索引查询** |
| 异步 | ❌ | ❌ | ❌ | ✅（不阻塞主线程） |
| 事务支持 | ❌ | ❌ | ❌ | ✅ |
| Web Worker 可用 | ❌ | ❌ | ❌ | ✅ |
| 跨标签页共享 | ✅ | ✅ | ❌ | ✅ |

> [!tip] 面试一句话
> IndexedDB 是浏览器内置的 NoSQL 数据库，支持大容量、结构化存储、索引查询和事务，适合离线应用和需要本地持久化的复杂数据场景。

---

## 二、核心概念

### 数据库（Database）
每个域名可创建多个数据库，每个数据库有版本号。升级数据库结构必须提升版本号，在 `onupgradeneeded` 回调中执行。

### 对象仓库（Object Store）
类似关系数据库的"表"，但存储的是 JS 对象（NoSQL 风格）。每个对象仓库有一个主键（`keyPath` 或自增 `autoIncrement`）。

### 索引（Index）
对对象仓库中某个属性建立索引，用于快速查找。类似数据库的二级索引。

### 事务（Transaction）
所有操作必须在事务中进行，保证数据一致性。事务有三种模式：
- `readonly` — 只读，多个只读事务可并发
- `readwrite` — 读写，独占
- `versionchange` — 结构变更专用（`onupgradeneeded` 中自动创建）

### 游标（Cursor）
用于遍历对象仓库中的记录，类似数据库游标。

---

## 三、基本操作

### 3.1 打开数据库

```js
const request = indexedDB.open('myDB', 1) // 数据库名, 版本号

// 首次创建或版本升级时触发
request.onupgradeneeded = (event) => {
  const db = event.target.result

  // 创建对象仓库（如果不存在）
  if (!db.objectStoreNames.contains('users')) {
    const store = db.createObjectStore('users', {
      keyPath: 'id',        // 用对象的 id 字段作为主键
      // autoIncrement: true // 或者使用自增主键
    })

    // 创建索引（字段名, 索引名, 配置）
    store.createIndex('name', 'name', { unique: false })
    store.createIndex('email', 'email', { unique: true })
  }
}

request.onsuccess = (event) => {
  const db = event.target.result
  console.log('数据库打开成功', db)
}

request.onerror = (event) => {
  console.error('数据库打开失败', event.target.error)
}
```

### 3.2 增（add / put）

```js
function addUser(db, user) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')

  const request = store.add(user) // add: 主键存在则报错
  // const request = store.put(user) // put: 主键存在则更新（upsert）

  request.onsuccess = () => console.log('添加成功，id:', request.result)
  request.onerror = () => console.error('添加失败', request.error)

  // 事务完成
  tx.oncomplete = () => console.log('事务完成')
  tx.onerror = () => console.error('事务失败', tx.error)
}

addUser(db, { id: 1, name: '靓仔', email: 'test@example.com', age: 25 })
```

### 3.3 查（get / getAll / index）

```js
// 通过主键查询
function getUser(db, id) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const request = store.get(id)

  request.onsuccess = () => console.log('查询结果:', request.result)
}

// 查询所有
function getAllUsers(db) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const request = store.getAll()

  request.onsuccess = () => console.log('所有用户:', request.result)
}

// 通过索引查询
function getUserByName(db, name) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')
  const index = store.index('name') // 使用 name 索引
  const request = index.getAll(name) // 查所有 name === 'xxx' 的记录

  request.onsuccess = () => console.log('按名字查询:', request.result)
}
```

### 3.4 改（put）

```js
function updateUser(db, user) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  // put 会覆盖整个对象（相当于 upsert）
  store.put({ ...user, updatedAt: Date.now() })
}
```

### 3.5 删（delete）

```js
function deleteUser(db, id) {
  const tx = db.transaction('users', 'readwrite')
  const store = tx.objectStore('users')
  const request = store.delete(id)

  request.onsuccess = () => console.log('删除成功')
}

// 清空整个仓库
function clearStore(db) {
  const tx = db.transaction('users', 'readwrite')
  db.transaction('users', 'readwrite').objectStore('users').clear()
}
```

### 3.6 游标遍历（范围查询）

```js
function getUsersInAgeRange(db, minAge, maxAge) {
  const tx = db.transaction('users', 'readonly')
  const store = tx.objectStore('users')

  // IDBKeyRange 定义查询范围
  const range = IDBKeyRange.bound(minAge, maxAge) // [minAge, maxAge]
  // IDBKeyRange.lowerBound(18)      // >= 18
  // IDBKeyRange.upperBound(30)      // <= 30
  // IDBKeyRange.only(25)            // === 25

  const results = []
  const request = store.index('age').openCursor(range)

  request.onsuccess = (event) => {
    const cursor = event.target.result
    if (cursor) {
      results.push(cursor.value)
      cursor.continue() // 移动到下一条
    } else {
      // 遍历完毕
      console.log('范围查询结果:', results)
    }
  }
}
```

---

## 四、Promise 封装（实用版）

原生 IndexedDB 全是回调，实际项目中一般封装成 Promise：

```js
// db.js - 简易封装
class IDBHelper {
  constructor(dbName, version, stores) {
    this.dbName = dbName
    this.version = version
    this.stores = stores // [{ name, keyPath, indexes }]
    this.db = null
  }

  open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onupgradeneeded = (event) => {
        const db = event.target.result
        this.stores.forEach(({ name, keyPath, autoIncrement, indexes = [] }) => {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath, autoIncrement })
            indexes.forEach(({ field, unique }) => {
              store.createIndex(field, field, { unique })
            })
          }
        })
      }

      request.onsuccess = (e) => {
        this.db = e.target.result
        resolve(this.db)
      }

      request.onerror = (e) => reject(e.target.error)
    })
  }

  // 通用操作封装
  _run(storeName, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      const request = fn(store)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  add(storeName, data) {
    return this._run(storeName, 'readwrite', (store) => store.add(data))
  }

  put(storeName, data) {
    return this._run(storeName, 'readwrite', (store) => store.put(data))
  }

  get(storeName, key) {
    return this._run(storeName, 'readonly', (store) => store.get(key))
  }

  getAll(storeName) {
    return this._run(storeName, 'readonly', (store) => store.getAll())
  }

  delete(storeName, key) {
    return this._run(storeName, 'readwrite', (store) => store.delete(key))
  }
}

// 使用示例
const db = new IDBHelper('myApp', 1, [
  {
    name: 'users',
    keyPath: 'id',
    indexes: [
      { field: 'name', unique: false },
      { field: 'email', unique: true },
    ],
  },
])

await db.open()
await db.put('users', { id: 1, name: '靓仔', email: 'a@b.com' })
const user = await db.get('users', 1)
console.log(user) // { id: 1, name: '靓仔', email: 'a@b.com' }
```

---

## 五、实际应用场景

### 场景 1：离线缓存 API 数据
```js
// Service Worker + IndexedDB 实现离线可用
async function fetchWithCache(url) {
  const cached = await db.get('apiCache', url)
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data // 5分钟内用缓存
  }
  const res = await fetch(url)
  const data = await res.json()
  await db.put('apiCache', { url, data, timestamp: Date.now() })
  return data
}
```

### 场景 2：大文件分片存储（断点续传）
```js
// 将文件切片存入 IndexedDB，断网后可继续上传
async function saveChunk(fileId, chunkIndex, blob) {
  await db.put('uploadChunks', {
    id: `${fileId}_${chunkIndex}`,
    fileId,
    chunkIndex,
    blob, // IndexedDB 可以直接存 Blob！
    uploaded: false,
  })
}
```

### 场景 3：草稿自动保存
```js
// 编辑器每隔30秒自动保存草稿
const autosave = debounce(async (content) => {
  await db.put('drafts', {
    id: 'article_draft',
    content,
    savedAt: new Date().toISOString(),
  })
}, 30000)
```

---

## 六、注意事项 & 面试陷阱

| 问题 | 说明 |
|------|------|
| **版本号只能升不能降** | 降版本会触发 `blocked` 事件，老标签页不关闭会阻塞数据库升级 |
| **同源策略** | 和 LocalStorage 一样，只有同源页面才能访问 |
| **隐私模式下数据不持久** | 无痕模式关闭后数据清空 |
| **事务自动提交** | 事务在所有请求完成且没有新请求时自动提交，不需要手动 commit |
| **add vs put** | `add` 主键重复会报错；`put` 是 upsert（插入或更新） |
| **大量数据用游标，不用 getAll** | `getAll()` 一次性把数据读到内存，数据量大时会卡顿 |
| **不能直接存 class 实例** | 序列化时原型链丢失，建议存纯对象 |

> [!tip] 面试回答要点
> IndexedDB 是异步的事务型 NoSQL 数据库，适合存大量结构化数据。核心是「数据库→对象仓库→索引→事务」四层结构。原生 API 回调较多，实际项目通常封装成 Promise 或使用 `idb` 库（Workbox 也内置了封装）。

---

## 七、推荐工具库

| 库 | 说明 |
|----|------|
| [`idb`](https://github.com/jakearchibald/idb) | Jake Archibald 出品，Promise 封装，轻量（~1KB），强烈推荐 |
| `Dexie.js` | 功能更丰富，类 ORM 风格，支持 TypeScript |
| `localForage` | 统一 API，自动降级 IndexedDB → WebSQL → LocalStorage |

```js
// idb 库使用示例（推荐）
import { openDB } from 'idb'

const db = await openDB('myDB', 1, {
  upgrade(db) {
    db.createObjectStore('users', { keyPath: 'id' })
  },
})

await db.put('users', { id: 1, name: '靓仔' })
const user = await db.get('users', 1)
```
