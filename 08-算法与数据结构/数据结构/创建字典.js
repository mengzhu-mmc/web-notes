function Dictionary() {
    var items = {}

    this.has = function (key) {
        return items.hasOwnProperty(key)
    }

    // 向字典中添加新元素 或 更新某个元素
    this.set = function (key, value) {
        items[key] = value
    }
    
    this.remove = function (key) {
        if (this.has(key)) {
            delete items[key];
            return true
        }
        return false
    }

    this.get = function (key) {
        return this.has(key) ? items[key] : undefined
    }

    this.values = function () {
        var values = [];
        // 我们不能仅仅使用for-in语句来遍历items对象的所有属性，还需要使用
        // has方法（验证items对象是否包含某个属性） ，因为对象的原型也会包含对象
        // 的其他属性（JavaScript基本的Object类中的属性将会被继承，并存在于当前对
        // 象中，而对于这个数据结构来说，我们并不需要它们） 。 
        for (const k in items) {
            if (this.has(k)) {
                values.push(items[k])
            }
        }
        return values
    }

    this.clear = function () {
        items = {}
    }

    this.size = function () {
        return Object.keys(items).length
    }

    this.keys = function () {
        return Object.keys(items)
    }
}