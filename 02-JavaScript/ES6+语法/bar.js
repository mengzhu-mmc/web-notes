function hello(who) {
    return "let me introduce:" + who
}
/* node 里面的是 exports !!! */

/* 如果是通过export default xxx;导出数据，那么在接受导出数据的时候，变量名称可以和导出的名称不一致。但是在模块里只能使用一次 export default */
export default {
    hello
}