/* 
在pc浏览器上
window.innerWidth获得的宽度是包括滚动条宽度的
document.documentElement.clientWidth获得的宽度不包括滚动条宽度
所以获得的不一样，当然页面没有超出一屏也是一样的

在移动端浏览器上，滚动条悬浮在页面内容上，不占宽度，所以获得的是一样的
*/