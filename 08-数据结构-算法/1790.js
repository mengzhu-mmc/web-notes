/* 
    给你长度相等的两个字符串 s1 和 s2 。一次 字符串交换 操作的步骤如下：选出某个字符串中的两个下标（不必不同），并交换这两个下标所对应的字符。
    如果对 其中一个字符串 执行 最多一次字符串交换 就可以使两个字符串相等，返回 true ；否则，返回 false 。

    示例 1：
    输入：s1 = "bank", s2 = "kanb"
    输出：true
    解释：例如，交换 s2 中的第一个和最后一个字符可以得到 "bank"

    示例 2：
    输入：s1 = "attack", s2 = "defend"
    输出：false
    解释：一次字符串交换无法使两个字符串相等

*/
// 自己写的
// var areAlmostEqual = function(s1, s2) {
//     s1 = s1.split('');
//     s2 = s2.split('');
//     let differentList1 = []
//     let differentList2 = []
//     for(let i = 0; i < s1.length; i++) {
//         if (s2[i] !== s1[i]) { differentList1.push(s1[i]); differentList2.unshift(s2[i]);continue;}
//         continue  
//     }
//     if (differentList1.join('') == differentList2.join('') && differentList1.length <=2 ) {
//         return true
//     }
//     return false
// };

/* 
    大佬2的： JavaScript版
    思路：先将两个字符串排序，如果不相等，说明有不一致的元素，返回false; 如果相等,遍历比较字符串的每一个字符，如果不相等的数量大于2个，也是返回false，反之返回true

    var areAlmostEqual = function(s1, s2) {
    let temp1=s1,temp2=s2;
    let count = 0;
     let arr1=temp1.split('').sort((a,b)=>(a.charCodeAt(0)-b.charCodeAt(0))).join('');
     let arr2=temp2.split('').sort((a,b)=>(a.charCodeAt(0)-b.charCodeAt(0))).join('');
     if(arr1!=arr2) return false;
    for(let i=0;i<s1.length;i++){
        if(s1.charAt(i)!=s2.charAt(i)){
            count++;
        }
    }
    if(count>2) return false;
    return true;
};
*/

// 大佬1的：（Java版）
/* 
    public boolean areAlmostEqual(String s1, String s2) {
        if (s1.length() != s2.length()) return false;
        int count = 0, m = -1, n = -1;
        for (int i = 0, j = 0; i < s1.length(); i++, j++) {
            if (s1.charAt(i) != s2.charAt(j)) {
                count++;
                if (m == -1) m = i;
                if (n == -1 && m != i) n = i;
            }
        }
        if (count == 0) return true;
        if (count == 2 && s1.charAt(m) == s2.charAt(n) && s2.charAt(m) == s1.charAt(n))
            return true;
        return false;
    }
*/


var areAlmostEqual = function(s1, s2) {
    let temp1=s1,temp2=s2;
    let count = 0;
     let arr1=temp1.split('').sort((a,b)=>(a.charCodeAt(0)-b.charCodeAt(0))).join('');
     let arr2=temp2.split('').sort((a,b)=>(a.charCodeAt(0)-b.charCodeAt(0))).join('');
     if(arr1!=arr2) return false;
    for(let i=0;i<s1.length;i++){
        if(s1.charAt(i)!=s2.charAt(i)){
            count++;
        }
    }
    if(count>2) return false;
    return true;
};

console.log(areAlmostEqual('asdf', 'dddd'))