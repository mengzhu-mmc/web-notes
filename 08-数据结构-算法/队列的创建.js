function Queue() {
    const items = [];
    // 队列末尾添加新项
    this.enqueue = function (element) {
        items.push(element)
    }
    // 队列首部删除项
    this.dequeue = function () {
        return items.shift()
    }
    // 返回队列最前面的项
    this.front = function() {
        return items[0]
    }
    // 队列是否为空
    this.isEmpty = function() {
        return items.length === 0
        
    }
    // 队列的长度
    this.size = function() {
        return items.length
    }
    // 打印队列信息
    this.print = function() {
        console.log(items.toString())
    }
}