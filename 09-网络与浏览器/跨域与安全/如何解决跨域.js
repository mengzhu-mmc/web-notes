/* 
    1. 跨域资源共享
    2. 使用JSONP（常用）
    3. 修改document.domain
    4. 使用window.name
*/

// JSONP 是 JSON with Padding（填充式json）的简写
// 直接用XMLHttpRequest请求不同域上的数据时，是不可以的。但是，在页面上引用不同域的JS脚本文件确实可以的，jsonp正是利用了这个特性来实现的