// 用递归实现 斐波那契数列

// 常规方法： fib(n) = fib(n-1) + fib(n-2) =  fib(n-3) + ... + 1 （会占用大量内存）
// function fib(n) {
//     if (n == 1 || n == 2) {
//         return 1
//     }
//     return fib(n-1) + fib(n-2)
// } 

// console.log(fib(6))

// 尾递归 
/* 尾递归和一般的递归不同在对内存的占用，普通递归创建stack累积而后计算收缩，尾递归只会占用恒量的内存（和迭代一样）。 */

// function fib(n, pre=1, prePre=0) {
//     if (n == 1) {
//         return pre
//     }
//     return fib(n-1, pre+prePre, pre)
// }
function fib(n, pre=1, prePre=0) {
    if (n == 0) {
        return prePre
    }
    return fib(n-1, pre+prePre, pre)
}

// function fib(n, pre = 1, prePre = 0) {
//     if(n == 1) {
//         return pre
//     }
//     return fib(n-1, pre+prePre, pre)
// }
console.log(fib(6))