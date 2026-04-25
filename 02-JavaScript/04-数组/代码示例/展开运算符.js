// let arr = [1,2,3,4],
//     arr2 = [1,2,...arr];
// console.log(arr2)// => [1, 2, 1, 2, 3, 4]

// let [a,b,...c] = arr;
// console.log(a,b,c) // => 1 2 [3, 4]

let obj = {
    a:1,
    b:2
}
let obj2 = {
    ...obj,
    c:3,
    d:4
}
console.log(obj2) // => {a: 1, b: 2, c: 3, d: 4}