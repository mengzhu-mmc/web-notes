const express = require('express')
const fs = require('fs')
const path = require('path')
const app = express()
const fileName = path.join(__dirname, "data.json") 
const port = 3000

app.all("*",function(req,res,next){    //设置允许跨域的域名，*代表允许任意域名跨域
    //     //设置允许跨域的域名，*代表允许任意域名跨域
        res.header("Access-Control-Allow-Origin","*");
    //     // //允许的header类型
        res.header("Access-Control-Allow-Headers","content-type");
    //     // //跨域允许的请求方式 
        res.header("Access-Control-Allow-Methods","DELETE,PUT,POST,GET,OPTIONS");
        if (req.method.toLowerCase() == 'options')
            res.send(200);  //让options尝试请求快速结束
        else
            next();
    })

app.get('/', (req, res) => {
    fs.readFile(fileName, 'utf-8', (err, data) => {
        if (err) {
            console.log(err)
        } 
        res.send(data.toString())
    })
})
app.get('/say', function(req, res) {
    let { wd, callback } = req.query
    console.log(wd) 
    console.log(callback)
    res.end(`${callback}('Hello thank you')`)
})
app.listen(port, ()=> {
    console.log('App is running at' + port + '...') 
})