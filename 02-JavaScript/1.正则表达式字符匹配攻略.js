/* 
    内容包括：
        1.两种模糊匹配
        2.字符组
        3.量词
        4.分支结构
        5.案例分析
*/

/* 一、两种模糊匹配 */
// 横向模糊匹配 ：一个正则可匹配的字符串的长度不是固定的，可以是多种情况的。
/* 加个 g 后，全局匹配，强调的是"所有"，而不是"第一个" */
let regexp = /ab{2,5}c/g
let string = "abc abbc abbbc"
console.log(string.match(regexp)) //=> [ 'abbc', 'abbbc' ]

/* 纵向模糊匹配： 一个正则匹配的字符串，具体到某一位字符时，它可以不是某个确定的字符，可以有多种可能。 */
let regexp2 = /a[123]b/g
let string2 = "a0b a1b a2b a3b"
console.log(string2.match(regexp2))