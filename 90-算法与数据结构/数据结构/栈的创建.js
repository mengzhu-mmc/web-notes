function Stack() {
    const items = [];
    // 添加新元素
    this.push = function (ele) {
        items.push(ele)
    }
    // 移除栈里的元素(只能移除栈顶元素)
    this.pop = function () {
        return items.pop()
    }
    // 查看栈顶元素
    this.peek = function () {
        return items[items.length - 1]
    }
    // 查看栈是否为空
    this.isEmpty = function () {
        return items.length === 0
    }
    // 查看栈的长度
    this.size = function () {
        return items.length
    }
    // 移除栈里的所有元素
    this.clear = function () {
        items = []
    }
    // 打印栈里的元素
    this.print = function () {
        console.log(items.toString());
    }
}
// let stack1 = new Stack()
// let stack2 = new Stack()
// stack1.push(1)
// stack1.push(2)
// stack1.push(3)
// stack1.print()
// stack2.print()