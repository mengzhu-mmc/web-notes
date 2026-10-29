type OptTuple = [string, number?];

// type OptTuple = string; // type 重复声明报错  interface重复声明合并
const out: OptTuple = ['zs']


// never类型（含义是:永远不会发生的值类型）的使用场景：
// 使用场景1：
function panic(msg: string): never {
  throw new Error(msg)
}
// 使用场景2：联合类型兜底校验，防止以后加枚举值或类型漏写逻辑
type Status = 'success' | 'fail' | 'loading';
function handleStatus(s: Status) {
  switch (s) {
    case 'success': break;
    case 'fail': break;
    // 假如以后新增一个状态：'loading' 忘了写 case
    default:
      // 报错！TS 直接提醒你漏分支了
      const check: never = s;
  }
}


// 这样只能推断出数组的元素是字符串，但是不能保证数组的元素是常量字符串
const colors2 = ['red', 'green', 'blue']
colors2[0] = 'yellow'

// as const可以保证数组的元素是常量
const colors = ['red', 'green', 'blue'] as const
// colors[0] = 'yellow'// 报错，因为数组的元素是常量字符串


// 泛型
function fn<T>(arg: T): T {
  return arg
}

interface apiResponse<T> {
  data: T;
  code: number;
  message: string;
}

class Stack<T> {
  items: T[] = []
  
  push(item: T) {
    this.items.push(item)
  }

  pop(): T | undefined {
    return this.items.pop()
  }
}

// 泛型约束
// // 约束 T 必须有 length 属性
function logLength<T extends { length: number }>(arg: T) {
  console.log(arg.length)
}

// keyof 约束
function getProperty<T, K extends keyof T>(arg: T, key: K): T[K] {
  return arg[key]
}


// 条件类型
type IsString<T> = T extends string ? true : false
type A = IsString<string> // true
type B = IsString<number> // false


// 分布式条件类型  ---- 当 T 是联合类型时，自动分发
type ToArray<T> = T extends any ? T[] : never
type C = ToArray<string | number>; // string[] | number[]

// 避免分发： T 和 any 用 [] 包裹
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never  // 如果any不用 [] 包裹，相当于：type ToArrayNonDist<T>: T[]
type D = ToArrayNonDist<string | number>; // (string | number)[]
const arr: D = [1, '2']


// infer 关键字, 声明一个 “待推断的类型变量” ， 整你出现在条件类型的extends子句中
// 提取函数返回值类型
type MyReturnType<T> = T extends (arg: any[]) => infer R ? R : never

// 提取 Promise的值类型: 把 Promise<T> 里的 T 取出来；如果不是 Promise，就直接返回原类型。
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T
type E = UnwrapPromise<Promise<string>>; // string

// 提取数组元素类型
type ElementOf<T> = T extends (infer E)[] ? E : T
type F = ElementOf<number[]>; // number

// 提取函数第一个参数
type FirstArg<T> = T extends (first: infer F, ...res: any[]) => any ? F : never

// 提取嵌套promise
type DeepUnwrap<T> = T extends Promise<infer U> ? DeepUnwrap<U> : T
type G = DeepUnwrap<Promise<Promise<string>>>; // string



// Partial
// Required
// Readonly

function createUser(name: string) {
  return { id: "1", name };
}
// ReturnType<typeof createUser> // 获取返回值
// Parameters<typeof createUser> // 获取函数的参数
// type first = Parameters<typeof createUser>[0] // 获取函数的第一个参数