/* 
document.documentElement.clientWidth与document.body.clientWidth在浏览器滚动条的情况:
    body与documentElement这两个属性在浏览器的body设置成<body style="overflow:hidden">  时，得到的值是不同的。

    当有overflow:hidden时，body.clientHeight才是真实值，documentElement.clientHeight是没有滚动条的值。
*/