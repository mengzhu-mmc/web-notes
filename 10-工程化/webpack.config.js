let path = require('path')
let HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = {
    mode: 'production',
    entry: "./src/index.js",
    output: {
        filename: "bundle.min.js",
        path: path.resolve(__dirname, 'build')
    },
    devServer: {
        port: 3001,
        contentBase: './build',
        proxy: {
            "/": {
                target: "http://localhost:3000",
                changeOrigin: true
            }
        }
    }, 
    plugins: [
        new HtmlWebpackPlugin({
            template: './src/index.html',
            filename: "index.html"
        })
    ]
}