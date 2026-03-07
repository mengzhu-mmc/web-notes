### npm i 与 npm i -S 和 -D 的区别


```js
// 写入到 dependencies 对象
npm i module_name  -S  = >  npm install module_name --save
```
```js
// 写入到 devDependencies 对象
npm i module_name  -D  => npm install module_name --save-dev
```



#### 在 package.json文件里面提现出来的区别就是:

```js
使用 --save-dev 安装的 插件，被写入到 devDependencies 对象里面去，
而使用 --save 安装的插件，责被写入到 dependencies 对象里面去。
```

#### 那 package.json 文件里面的 devDependencies 和 dependencies 对象有什么区别呢？

```js
devDependencies里面的插件只用于开发环境，不用于生产环境，
dependencies  是需要发布到生产环境的。
```