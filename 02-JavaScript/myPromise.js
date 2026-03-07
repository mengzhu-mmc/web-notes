// myPromise.js

// 先定义三个常量表示状态
const PENDING = 'pending'
const FULFILLED = 'fulfilled'
const REJECTED = 'rejected'



// 新建 myPromise 类
class myPromise {
    constructor(executor) {
        // executor 是一个执行器，进入会立即执行
        executor(this.resolve, this.reject)
    }

    // 存储状态的变量，初始值是pending
    status = PENDING

    // resolve和 reject 为什么要用箭头函数
    // 如果直接调用的话，普通函数的 this 指向 window 或者 undefined
    // 用箭头函数就可以让 this 指向当前实例对象
    // 成功之后的值
    value = null;
    // 失败之后的原因
    reason = null;

    // 更改成功后的状态
    resolve = (value) => {
        if (this.status === PENDING) {
            // 状态修改为成功
            this.status = FULFILLED
            // 保存成功之后的值
            this.value = value

            // 判断成功回调是否存在，如果存在就调用
            while(this.onFulfilledCallback.length) {
                this.onFulfilledCallback.shift()(value)
            }
        }
    }

    // 更改失败后的状态
    reject = (reason) => {
        if (this.status === PENDING) {
            // 状态修改为失败
            this.status = REJECTED
            // 保存失败的原因
            this.reason = reason

            // 判断失败回调是否存在，如果存在就调用
            this.onRejectedCallback && this.onRejectedCallback(reason)
        }
    }

    // 存储成功回调函数
    // onFulfilledCallback = null
    onFulfilledCallback = []
    // 存储失败回调函数
    // onRejectedCallback = null
    onRejectedCallback = []
    
    // then 的简单实现
    then(onFulfilled, onRejected) {
        // 为了链式调用这里直接创建一个MyPromise,并在后面 return 出去
        const promise = new myPromise((resolve, reject) => {
            // 这里的内容在执行器中，会立即执行
            if (this.status === FULFILLED) {
                // 获取成功回调函数的执行结果
                const x = onFulfilled(this.value)
                onFulfi
            } else if (this.status === REJECTED) {
                // 调用失败回调函数，并将结果返回
                onRejected(this.reason)
            } else if (this.status === PENDING) {
                // 因为不知道后面状态的变化情况，所以讲成功回调和失败回调存储起来
                // 等到执行成功、失败函数的时候再传递
                this.onFulfilledCallback.push(onFulfilled)
                this.onRejectedCallback.push(onRejected)
            }
        })
        return promise
    }

    resolvePromise(x, resolve, reject) {
        if (x instanceof MyPromise) {
            x.then(resolve, reject)
        } else {
            resolve(x)
        }
        
    }
    
}

module.exports = myPromise
