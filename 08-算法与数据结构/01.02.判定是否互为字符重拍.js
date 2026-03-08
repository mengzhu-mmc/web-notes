/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
var CheckPermutation = function(s1, s2) {
    if (s1.length !== s2.length) {
        return false
    }
    let arr1 = s1.split('').sort().join('')
    let arr2 = s2.split('').sort().join('')
    if (arr1 !== arr2) {
        return false
    }
    return true
}('abc', 'bac')