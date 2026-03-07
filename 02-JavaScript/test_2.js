const MyPromise = require("./reviewPromise");
const p1 = new MyPromise((resolve, reject) => {
  resolve(1); //同步executor测试
});

p1.then((res) => {
  console.log(res);
  return 2; //链式调用测试
})
  .then() //值穿透测试
  .then((res) => {
    console.log(res);
    return new MyPromise((resolve, reject) => {
      resolve(3); //返回Promise测试
    });
  })
  .then((res) => {
    console.log(res);
    throw new Error("reject测试"); //reject测试
  })
  .then(
    () => {},
    (err) => {
      console.log(err);
    }
  );
