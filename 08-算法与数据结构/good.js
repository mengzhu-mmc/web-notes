/**
 * 代码中的类名、方法名、参数名已经指定，请勿修改，直接返回方法规定的值即可
 * 
 * @description 对字符串版本号构成的数组进行排序
 * 
 * @param versions string字符串一维数组 
 * @return string字符串一维数组
 */
// 自己的：
// function sortVersions( versions ) {
//     if (versions.length == 1 || !versions) return versions
//     let arr = versions.map((item, index) => {
//         return item.split('.').map(item => {
//             return item-=0
//         });
//     })
//     for (let i=0,j = i+1; j < arr.length; j++) {            
//         if (arr[i][0] > arr[j][0] || (arr[i][0] == arr[j][0] && arr[i][1] > arr[j][1]) || (arr[i][0] == arr[j][0] && arr[i][1] == arr[j][1] && arr[i][2] > arr[j][2]) ) {
//             let a = null;
//             a = arr[i]
//             arr[i] = arr[j]
//             arr[j] = a
//         }
//         i++
//     }
//     console.log(arr);
// }
// sortVersions(['1.5.2', '1.45.2','1.222.1'])
// module.exports = {
//     sortVersions : sortVersions
// };
