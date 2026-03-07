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

1. 从属关系：link是html标签，不仅可以加载CSS文件,