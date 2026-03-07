// 这是一个单独的js文件
var i=0;
function timedCount()
{
i=i+1;
postMessage(i); //把数据发送出去
setTimeout("timedCount()",500);
}
timedCount();