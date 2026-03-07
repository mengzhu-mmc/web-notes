const a = 'abc';
console.log(a instanceof String); // false

const b = new String('abc');
console.log(b instanceof String); // true

console.log(String instanceof String);  // false
console.log(Object instanceof Object);  // true
console.log(Function instanceof Function); // true 
console.log(Function instanceof Object); // true

/*  
    在 MDN 上是这样描述 instanceof 的 ：
        instanceof 运算符用于测试构造函数的 prototype 属性是否出现在对象原型链中的任何位置 
*/

/* 比较好的是  Object.prototype.toString.call() */