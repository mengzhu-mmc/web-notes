let cp = require('child_process')

// exec 实现

// exec的第一个参数，跟shell命令完全相似。
// cp.exec('echo hello exec', function(err, stdout) {
//     console.log(stdout)
// })

// execFile 实现
cp.execFile('echo', ['hello', 'execFile'], function(err, stdout) {
    console.log(stdout)
})
