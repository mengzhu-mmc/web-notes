function updateTime () {
    this.timmer = this.timmer || setInterval(() => this.time = new Date().toUTCString(),6000)
    return this.time
}

const http = require('http')
http.createServer((req, res) => {
    const {url} = req
    if (url == '/') {
        res.end(`
            <html>
                html update time ${updateTime()}
                <script src='main.js'></script>
            </html>
        `)
    } else if (url === '/main.js') {
        const content = `document.writeln('<br> JS Update Time: ${updateTime()}')`

        // 强缓存
        // res.setHeader('Expires', new Date(Date.now() + 10 * 1000).toUTCString()) // http1.0
        // res.setHeader('Cache-Control', 'max-age=20') // http 1.1

        // 协商缓存
        res.setHeader('Cache-Control', 'no-cache')
        // res.setHeader('last-modified', new Date().toUTCString())
        // if (new Date(req.headers['if-modified-since']).getTime() + 6 * 1000 > Date.now()) {
        //     console.log('协商缓存命中')
        //     res.statusCode = 304
        //     res.end()
        //     return 
        // }

        const crypto = require('crypto')
        // digest('hex') 把二级制的数字变为16进制字符串
        const hash = crypto.createHash('sha1').update(content).digest('hex')
        res.setHeader('Etag', hash)
        if (req.headers['if-none-match'] === hash ) {
            console.log('Etag 缓存命中')
            res.statusCode = 304
            res.end()
            return
        }
        
        res.statusCode = 200
        res.end(content)
    } else if (url === '/favicon.io') {
        res.end('')
    }
})
.listen(3000, () => {
    console.log('Server is running at port 3000')
})