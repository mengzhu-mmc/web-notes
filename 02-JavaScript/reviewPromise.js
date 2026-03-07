const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class MyPromise {
  constructor(callback) {
    this._status = PENDING;
    this._value = undefined;
    this.fulfilledQueue = [];
    this.rejectedQueue = [];

    const _resolve = (value) => {
      const run = () => {
        if (this._status !== PENDING) return;

        this._status = FULFILLED;
        this._value = value;
        while (this.fulfilledQueue.length) {
          const callback = this.fulfilledQueue.shift();
          callback(value);
          // this.fulfilledQueue.shift()(value);
        }
      };
      setTimeout(run);
    };

    const _reject = (value) => {
      const run = () => {
        if (this._status !== PENDING) return;

        this._status = REJECTED;
        this._value = value;
        while (this.rejectedQueue.length) {
          // this.rejectedQueue.shift()(value);
          const callback = this.rejectedQueue.shift();
          callback(value);
        }
      };
      setTimeout(run);
    };

    callback(_resolve, _reject);
  }

  then(fulVal, rejVal) {
    fulVal = typeof fulVal === "function" ? fulVal : (fulVal) => fulVal;
    rejVal =
      typeof rejVal === "function"
        ? rejVal
        : (reason) => {
            throw new Error(reason instanceof Error ? reason.message : reason);
          };

    return new MyPromise((resolve, reject) => {
      const fulfilledFn = (value) => {
        try {
          const res = fulVal(value);
          res instanceof MyPromise ? res.then(resolve, reject) : resolve(res);
        } catch (error) {
          reject(error);
        }
      };
      const rejectedFn = (value) => {
        try {
          const res = rejVal(value);

          res instanceof MyPromise ? res.then(resolve, reject) : resolve(res);
        } catch (error) {
          reject(error);
        }
      };

      // 兼容同步任务
      switch (this._status) {
        case PENDING:
          this.fulfilledQueue.push(fulfilledFn);
          this.rejectedQueue.push(rejectedFn);
          break;
        case FULFILLED:
          fulfilledFn(this._value);
          break;
        case REJECTED:
          rejectedFn(this._value);
          break;
      }
    });
  }
  catch(rejectFn) {
    this.then(undefined, rejectFn);
  }
  finally(callback) {
    return this.then(
      (value) => {
        console.log("进resolve、");
        return MyPromise.resolve(callback()).then(() => value);
      },
      (reason) => {
        console.log("进reject");
        return MyPromise.resolve(callback()).then(() => {
          throw reason;
        });
      }
    );
  }
  static resolve(value) {
    if (value instanceof MyPromise) return value;
    return new MyPromise((resolve) => resolve(value));
  }

  static reject(value) {
    return new MyPromise((_, reject) => reject(value));
  }
}

const p1 = new MyPromise((resolve, reject) => {
  resolve(1); //同步executor测试
});

// p1.then((res) => {
//   console.log(res);
//   return 2; //链式调用测试
// })
//   .then() //值穿透测试
//   .then((res) => {
//     console.log(res);
//     return new MyPromise((resolve, reject) => {
//       resolve(3); //返回Promise测试
//     });
//   })
//   .then((res) => {
//     console.log(res);
//     throw new Error("reject测试"); //reject测试
//   })
//   .then(
//     () => {},
//     (err) => {
//       console.log(err);
//     }
//   );

MyPromise.reject(2)
  .finally(() => {
    console.log("还好");
  })
  .then(
    (res) => console.log(res, "--最终res"),
    (reason) => console.log("--最终err", reason)
  );

// module.exports = MyPromise;
