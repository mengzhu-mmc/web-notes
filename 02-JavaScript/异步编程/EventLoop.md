# [详解事件循环机制](https://mp.weixin.qq.com/s/m3a6vjp8-c9a2EYj0cDMmg)

事件循环机制从整体上告诉了我们 JavaScript 代码的执行顺序。学习事件循环机制之前，需要懂得如下概念：

- ==执行上下文(Execution context)==
- ==函数调用栈(call stack)==
- ==队列数据结构(queue)==
- ==Promise==

```
因为chrome浏览器中新标准中的事件循环机制与nodejs类似，因此此处就整合nodejs一起来理解，其中会介绍到几个nodejs有，但是浏览器中没有的API，只需要了解就好，不一定非要知道它是如何使用。比如process.nextTick，setImmediate
```

OK，那我就先抛出结论，然后以例子与图示详细给大家演示事件循环机制。

我们知道 JavaScript 的一大特点就是单线程，而这个线程中拥有唯一的一个事件循环。

```
当人新标准中的web worker涉及到了多线程，这里就不讨论了。
```

JavaScript 代码的执行过程中，除了依靠函数调用栈来搞定函数的执行顺序外，还依靠任务队列(task queue)来搞定另外一些代码的执行。

<img src="./640.webp" />

- 一个线程中，事件循环是唯一的，但是任务队列可以拥有多个。
- 任务队列又分为 macro-task（宏任务）与 micro-task（微任务），在最新标准中，它们被分别称为 task 与 jobs。
- macro-task 大概包括：`script(整体代码)`, `setTimeout` ,` setInterval` , `setImmediate`, I/O(文件读取、网络请求等) , UI rendering。
- micro-task 大概包括: `process.nextTick`, `Promise`, `Object.observe(已废弃)`,`MutationObserver(html5新特性)`
- `setTimeout`/`Promise`等我们称之为任务源。而进入任务队列的是他们指定的具体执行任务。

```js
// setTimeout中的回调函数才是进入任务队列的任务
setTimeout(function () {
  console.log("xxxx");
});
// 非常多的同学对于setTimeout的理解存在偏差。所以大概说一下误解：
// setTimeout作为一个任务分发器，这个函数会立即执行，而它所要分发的任务，也就是它的第一个参数，才是延迟执行
```

- 来自不同任务源的任务会进入到不同的任务队列。其中 `setTimeout` 与`setInterval`是同源的。
- 事件循环的顺序，决定了 JavaScript 代码的执行顺序。它从 script(整体代码)开始第一次循环。之后全局上下文进入函数调用栈。直到调用栈清空(只剩全局)，然后执行所有的 micro-task。当所有可执行的 micro-task 执行完毕之后。循环再次从 macro-task 开始，找到其中一个任务队列执行完毕，然后再执行所有的 micro-task，这样一直循环下去。
- 其中每一个任务的执行，无论是 macro-task 还是 micro-task，都是借助函数调用栈来完成。纯文字表述确实有点干涩，因此，这里我们通过 2 个例子，来逐步理解事件循环的具体顺序。

```js
// demo01  出自于上面我引用文章的一个例子，我们来根据上面的结论，一步一步分析具体的执行过程。
// 为了方便理解，我以打印出来的字符作为当前的任务名称
setTimeout(function () {
  console.log("timeout1");
});

new Promise(function (resolve) {
  console.log("promise1");
  for (var i = 0; i < 1000; i++) {
    i == 99 && resolve();
  }
  console.log("promise2");
}).then(function () {
  console.log("then1");
});

console.log("global1");
```

首先，事件循环从宏任务队列开始，这个时候，宏任务队列中，只有一个 script(整体代码)任务。每一个任务的执行顺序，都依靠函数调用栈来搞定，而当遇到任务源时，则会先分发任务到对应的队列中去，所以，上面例子的第一步执行如下图所示。

<img src="2.webp" />

第二步：script 任务执行时首先遇到了 setTimeout，setTimeout 为一个宏任务源，那么他的作用就是将任务分发到它对应的队列中。

<img src="3.webp" />

第三步：script 执行时遇到 Promise 实例。Promise 构造函数中的第一个参数，是在 new 的时候执行，因此不会进入任何其他的队列，而是直接在当前任务直接执行了，而后续的.then 则会被分发到 micro-task 的 Promise 队列中去。

因此，构造函数执行时，里面的参数进入函数调用栈执行。for 循环不会进入任何队列，因此代码会依次执行，所以这里的 promise1 和 promise2 会依次输出。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnuPEFCLo7mVLZtw2euic72ILSoWv8NRwI1u6BvRVUWMhUp9tcAEcdXsw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnJiauF7DSqm3LWFPSAxkib7IZgLMJZv94tr16mt0IWEI1jQUBTVT9nYtg/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnWTsWTibIIg3lATORf8k0R1UJFmNVRKGqdxRE0rN8vlgkaJPZFlhYmTw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

script 任务继续往下执行，最后只有一句输出了 globa1，然后，全局任务就执行完毕了。

第四步：第一个宏任务 script 执行完毕之后，就开始执行所有的可执行的微任务。这个时候，微任务中，只有 Promise 队列中的一个任务 then1，因此直接执行就行了，执行结果输出 then1，当然，他的执行，也是进入函数调用栈中执行的。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTn2Km49oqhAibw8SnZ8vnfibibEAcBofnteScibQeC5qnPI0fblgJgZiahibtw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第五步：当所有的 micro-tast 执行完毕之后，表示第一轮的循环就结束了。这个时候就得开始第二轮的循环。第二轮循环仍然从宏任务 macro-task 开始。

这个时候，我们发现宏任务中，只有在 setTimeout 队列中还要一个 timeout1 的任务等待执行。因此就直接执行即可。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnW3lrF2cCZ2iboHFShod7MgOh4McgYyIVtXtL71DbGgCQV82nf2xSsXA/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

这个时候宏任务队列与微任务队列中都没有任务了，所以代码就不会再输出其他东西了。

那么上面这个例子的输出结果就显而易见。大家可以自行尝试体会。

这个例子比较简答，涉及到的队列任务并不多，因此读懂了它还不能全面的了解到事件循环机制的全貌。所以我下面弄了一个复杂一点的例子，再给大家解析一番，相信读懂之后，事件循环这个问题，再面试中再次被问到就难不倒大家了。

```js
// demo02
console.log('golb1');

setTimeout(function() {
    console.log('timeout1');
    process.nextTick(function() {
        console.log('timeout1_nextTick');
    })
    new Promi se(function(resolve) {
        console.log('timeout1_promise');
        resolve();
    }).then(function() {
        console.log('timeout1_then')
    })
})

setImmediate(function() {
    console.log('immediate1');
    process.nextTick(function() {
        console.log('immediate1_nextTick');
    })
    new Promise(function(resolve) {
        console.log('immediate1_promise');
        resolve();
    }).then(function() {
        console.log('immediate1_then')
    })
})

process.nextTick(function() {
    console.log('glob1_nextTick');
})
new Promise(function(resolve) {
    console.log('glob1_promise');
    resolve();
}).then(function() {
    console.log('glob1_then')
})

setTimeout(function() {
    console.log('timeout2');
    process.nextTick(function() {
        console.log('timeout2_nextTick');
    })
    new Promise(function(resolve) {
        console.log('timeout2_promise');
        resolve();
    }).then(function() {
        console.log('timeout2_then')
    })
})

process.nextTick(function() {
    console.log('glob2_nextTick');
})
new Promise(function(resolve) {
    console.log('glob2_promise');
    resolve();
}).then(function() {
    console.log('glob2_then')
})

setImmediate(function() {
    console.log('immediate2');
    process.nextTick(function() {
        console.log('immediate2_nextTick');
    })
    new Promise(function(resolve) {
        console.log('immediate2_promise');
        resolve();
    }).then(function() {
        console.log('immediate2_then')
    })
})
```

这个例子看上去有点复杂，乱七八糟的代码一大堆，不过不用担心，我们一步一步来分析一下。

第一步：宏任务 script 首先执行。全局入栈。glob1 输出。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTncBUBBaBdsibkLErPibshQ7nm8T9aoibgqrFxuDCbT50CuodI2HGr3ML9w/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第二步，执行过程遇到 setTimeout。setTimeout 作为任务分发器，将任务分发到对应的宏任务队列中。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTn2jAdyweiccOs2YZnBo8JichQtpicTko8dJRrEYCZiaHxMcdl3RSOH1kPQw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第三步：执行过程遇到 setImmediate。setImmediate 也是一个宏任务分发器，将任务分发到对应的任务队列中。setImmediate 的任务队列会在 setTimeout 队列的后面执行。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnwc3MhIL65LFhZvSBzL9kQocRgtIwwY8sibyicuxx0BJ6I7sib22nFGGhg/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第四步：执行遇到 nextTick，process.nextTick 是一个微任务分发器，它会将任务分发到对应的微任务队列中去。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnKX9JOdyxK4PRZ63Tufeib4FPblx9HEYjWibtVww0lfeyIg9I677oiayrg/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第五步：执行遇到 Promise。Promise 的 then 方法会将任务分发到对应的微任务队列中，但是它构造函数中的方法会直接执行。因此，glob1_promise 会第二个输出。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnAY2ia6A8kibsCn7fH9QkfhwGFbzIPRGISwSbdcctWMyKCEtS8CqNibSCw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnXaHVqibabEElm4dvr5rufWLGl7iaEKjwiaib2719c8SojqHFfDCLu2iac5w/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第六步：执行遇到第二个 setTimeout。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnNaxkohWXJQ6x5aao0Ac19A4v7YeuNRg6iaQNH35fCxO5foa7dvSsDuQ/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第七步：先后遇到 nextTick 与 Promise

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnIGBPqpb6kfribksrP8p4IlIXyTibP0Qn8LSdAFIEb2qlxk4WfwYiaJv3Q/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

第八步：再次遇到 setImmediate。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnhjGRDkWZX8jjzkX4icwrCeiaq2sBEUYqy66Io0aOQep2d0Uj67a2aDzw/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

这个时候，script 中的代码就执行完毕了，执行过程中，遇到不同的任务分发器，就将任务分发到各自对应的队列中去。接下来，将会执行所有的微任务队列中的任务。

其中，nextTick 队列会比 Promie 先执行。nextTick 中的可执行任务执行完毕之后，才会开始执行 Promise 队列中的任务。

当所有可执行的微任务执行完毕之后，这一轮循环就表示结束了。下一轮循环继续从宏任务队列开始执行。

这个时候，script 已经执行完毕，所以就从 setTimeout 队列开始执行。

![图片](https://mmbiz.qpic.cn/mmbiz_png/Kn1wMOibzLcFxJstb7864NA97UxGsasTnzAIk4F3wRCdAoDtnqhKJdywuKXwl8uSn09iaJPHQkskyPHhg80eP5ow/640?wx_fmt=png&tp=webp&wxfrom=5&wx_lazy=1&wx_co=1)

setTimeout 任务的执行，也依然是借助函数调用栈来完成，并且遇到任务分发器的时候也会将任务分发到对应的队列中去。

只有当 setTimeout 中所有的任务执行完毕之后，才会再次开始执行微任务队列。并且清空所有的可执行微任务。

setTiemout 队列产生的微任务执行完毕之后，循环则回过头来开始执行 setImmediate 队列。仍然是先将 setImmediate 队列中的任务执行完毕，再执行所产生的微任务。

当 setImmediate 队列执行产生的微任务全部执行之后，第二轮循环也就结束了

```
大家需要注意这里的循环结束的时间节点。
```

```
当我们在执行setTimeout任务中遇到setTimeout时，它仍然会将对应的任务分发到setTimeout队列中去，但是该任务就得等到下一轮事件循环执行了。例子中没有涉及到这么复杂的嵌套，大家可以动手添加或者修改他们的位置来感受一下循环的变化。
```

当然，这些顺序都是 v8 的一些实现。我们也可以根据上面的规则，来尝试实现一下事件循环的机制。

```js
// 用数组模拟一个队列
var tasks = [];

// 模拟一个事件分发器
var addFn1 = function (task) {
  tasks.push(task);
};

// 执行所有的任务
var flush = function () {
  tasks.map(function (task) {
    task();
  });
};

// 最后利用setTimeout/或者其他你认为合适的方式丢入事件循环中
setTimeout(function () {
  flush();
});

// 当然，也可以不用丢进事件循环，而是我们自己手动在适当的时机去执行对应的某一个方法

var dispatch = function (name) {
  tasks.map(function (item) {
    if (item.name == name) {
      item.handler();
    }
  });
};

// 当然，我们把任务丢进去的时候，多保存一个name即可。
// 这时候，task的格式就如下
demoTask = {
  name: "demo",
  handler: function () {},
};

// 于是，一个订阅-通知的设计模式就这样轻松的被实现了
```
