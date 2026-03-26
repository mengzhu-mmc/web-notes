/* 
    Object.getOwnPropertyNames() 返回一个由指定对象的所有自身属性的属性名（包括不可枚举属性但不包括Symbol值作为名称的属性）组成的数组。
    
        var arr = ["a", "b", "c"];
        console.log(Object.getOwnPropertyNames(arr).sort()); // ["0", "1", "2", "length"]

        // 类数组对象
        var obj = { 0: "a", 1: "b", 2: "c"};
        console.log(Object.getOwnPropertyNames(obj).sort()); // ["0", "1", "2"]

        // 使用Array.forEach输出属性名和属性值
        Object.getOwnPropertyNames(obj).forEach(function(val, idx, array) {
        console.log(val + " -> " + obj[val]);
        });
        // 输出
        // 0 -> a
        // 1 -> b
        // 2 -> c

    Object.defineProperty() 方法会直接在一个对象上定义一个新属性，或者修改一个对象的现有属性，并返回此对象。
    const object1 = {};
    Object.defineProperty(object1, 'property1', {
        value: 42,
        writable: false
    });

    object1.property1 = 77;
    // throws an error in strict mode

    console.log(object1.property1);
    // expected output: 42


    获取对象数据长度:
        Object.getOwnPropertyNames(data).length
        
    Object.getPrototypeOf() 方法返回指定对象的原型（内部[[Prototype]]属性的值）
        const prototype1 = {}
        const object1 = Object.create(prototype1)
        console.log(Object.getPrototypeOf(object1) === prototype1); // true
       
*/ 
