const Koa = require('koa')
const Router = require('koa-router')

const app = new Koa()
const router = Router()

// jsonp
router.get('/say', (ctx) => {
    let {wd, callback} = ctx.request.query;
    console.log(wd, callback);
    ctx.body = `${callback}('me too')`
})

// cors (可以手写 也可以用 koa2-cors)
// app.use(async (ctx, next) => {
//     //，如果设置access-control-allow-origin为*星号（任何域），则Access-Control-Allow-Credentials头是不能设置为true的，这样写不能携带cookie了。
//     // ctx.response.set("Access-Control-Allow-Origin", '*');
//     // 这样写，只有 http://localhost:3000 可以访问。
//     ctx.response.set('Access-Control-Allow-Origin', 'http://localhost:3001');

//     ctx.response.set("Access-Control-Allow-Headers", 'Content-Type, Content-Length,Authorization, Accept, name');
//     ctx.response.set("Access-Control-Allow-Methods", 'PUT, POST, DELETE, GET, OPTIONS');
    
//     // 允许携带cookie
//     ctx.response.set("Access-Control-Allow-Credentials", true)
//     // 预检的存活时间
//     res.setHeader('Access-Control-Max-Age', 6) // 6 秒

    
//     if(ctx.request.method == 'OPTIONS') {
//         ctx.body = 'ok'
//     } 
//     next()
// })

router.put('/getData', (ctx, next) => {
    console.log(ctx.req.headers);
    ctx.body = 'me too~'
})

// proxy（只需要客户端处理）
router.get('/user/list', (ctx, next) => {
    ctx.body = "list1, 2, 3, 4"
})


app.use(router.routes())
app.use(router.allowedMethods())

app.listen(3000, () => {
    console.log("app is running at port 3000...");
})