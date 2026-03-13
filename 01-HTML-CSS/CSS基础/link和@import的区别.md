### 区别

```html
<!DOCTYPE html>
<html lang="en">
    <head>
        <link rel="stylesheet" rev="stylesheet" href="myCss.css" type="text/css" > 
        <style type="text/css" >   
            @import url("./myCss.css");   
        </style> 
    </head>
</html>
```

这是两种引用方法的常见用法，可以看出：

1. 从属关系：link是html标签，不仅可以加载CSS文件，还可以定义rel、rss连接属性等；@import是CSS提供的语法规则，只有导入样式表的作用；

       ```html
<link rel="stylesheet" href="index.css" type="text/css">
<link rel="shortcut icon" href="./favicon.ico">
       ```

2. link标签作为HTML元素，不存在兼容性问题，而@import是CSS2.1才有的语法，故老版本浏览器不能识别；
3. 可以通过JS操作DOM，来插入link标签改变样式；由于DOM方法是基于文档的，无法使用@import方式插入样式
4. link引入的css文件，会同步加载，而@import则是异步加载，会等页面面结构全部加载完成后再去加载引css入文件