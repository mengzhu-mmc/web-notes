function fn( key ,  index ) {
    if(key >= index) {
        return 1
    }
    let arr = '1'.repeat(key).split('').map(item => +item);
    let a = 0;
    while(arr.length <= index) {
        for (let i = 0; i < key; i++) {
            a+=arr[arr.length - i - 1]
        }
        arr.push(a);
        a=0
    }
    return arr[arr.length-1]
}

module.exports = {
    fn : fn
};