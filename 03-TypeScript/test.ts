type OptionalTuple = [name: string, age?: number];

const tupleOutput: OptionalTuple = ["zs"];

// never 类型：永远不会发生的值，常用于抛错函数和联合类型穷尽检查。
function panic(message: string): never {
  throw new Error(message);
}

type Status = "success" | "fail" | "loading";

function assertNever(value: never): never {
  return panic(`Unhandled status: ${String(value)}`);
}

function handleStatus(status: Status): string {
  switch (status) {
    case "success":
      return "处理成功";
    case "fail":
      return "处理失败";
    case "loading":
      return "处理中";
    default:
      return assertNever(status);
  }
}

// as const 可以让数组元素收窄为只读字面量类型。
const mutableColors: string[] = ["red", "green", "blue"];
mutableColors[0] = "yellow";

const readonlyColors = ["red", "green", "blue"] as const;
type Color = (typeof readonlyColors)[number];

function identity<T>(arg: T): T {
  return arg;
}

interface ApiResponse<TData> {
  data: TData;
  code: number;
  message: string;
}

class Stack<TItem> {
  private readonly items: TItem[] = [];

  push(item: TItem): void {
    this.items.push(item);
  }

  pop(): TItem | undefined {
    return this.items.pop();
  }
}

function logLength<TValue extends { length: number }>(value: TValue): number {
  return value.length;
}

function getProperty<TObject, TKey extends keyof TObject>(
  object: TObject,
  key: TKey,
): TObject[TKey] {
  return object[key];
}

type IsString<T> = T extends string ? true : false;
type StringCheck = IsString<string>;
type NumberCheck = IsString<number>;

type ToArray<T> = T extends unknown ? T[] : never;
type DistributedArray = ToArray<string | number>;

type ToArrayNonDistributed<T> = [T] extends [unknown] ? T[] : never;
type NonDistributedArray = ToArrayNonDistributed<string | number>;

const mixedArray: NonDistributedArray = [1, "2"];

type MyReturnType<TFunction> = TFunction extends (
  ...args: never[]
) => infer TResult
  ? TResult
  : never;

type UnwrapPromise<T> = T extends Promise<infer TValue> ? TValue : T;
type ElementOf<T> = T extends readonly (infer TElement)[] ? TElement : T;
type FirstArg<T> = T extends (first: infer TFirst, ...rest: never[]) => unknown
  ? TFirst
  : never;
type DeepUnwrap<T> = T extends Promise<infer TValue> ? DeepUnwrap<TValue> : T;

function createUser(name: string) {
  return { id: "1", name };
}

type CreatedUser = ReturnType<typeof createUser>;
type CreateUserParams = Parameters<typeof createUser>;
type FirstCreateUserParam = CreateUserParams[0];

const userResponse: ApiResponse<CreatedUser> = {
  code: 0,
  data: createUser("zs"),
  message: "ok",
};

export {
  handleStatus,
  identity,
  logLength,
  getProperty,
  tupleOutput,
  mixedArray,
  userResponse,
};

export type {
  Color,
  CreatedUser,
  DeepUnwrap,
  DistributedArray,
  ElementOf,
  FirstArg,
  FirstCreateUserParam,
  MyReturnType,
  NonDistributedArray,
  NumberCheck,
  OptionalTuple,
  StringCheck,
  UnwrapPromise,
};
