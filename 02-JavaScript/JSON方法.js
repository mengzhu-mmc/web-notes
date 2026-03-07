/* 
    JSON.parse() 方法用来解析JSON字符串，构造由字符串描述的JavaScript值或对象。提供可选的 reviver 函数用以在返回之前对所得到的对象执行变换(操作)。

    const json = '{"result":true, "count":42}';
    const obj = JSON.parse(json);

    console.log(obj.count); // 42

    console.log(obj.result); // true


    JSON.parse('{}');              // {}
    JSON.parse('true');            // true
    JSON.parse('"foo"');           // "foo"
    JSON.parse('[1, 5, "false"]'); // [1, 5, "false"]
    JSON.parse('null');            // null
*/