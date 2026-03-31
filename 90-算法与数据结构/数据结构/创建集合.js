function Set() {
    let items = {};

    // 如果值在集合中，返回true，否则返回false
    this.has = function (value) {
        // return value in items
        // 更好的实现方式 =>
        return items.hasOwnProperty(value);
    }

    this.add = function (value) {
        if (!this.has(value)) {
            items[value] = value;
            return true
        }
        return false    
    }

    this.remove = function (value) {
        if (this.has(value)) {
            delete items[value];
            return true
        }
        return false
    }

    this.clear = function () {
        items = {}
    }

    this.size = function () {
        return Object.keys(items).length
    }

    this.values = function () {
        return Object.keys(items)
    }

    // 并集：对于给定的两个集合，返回一个包含两个集合中所有元素的新集合。 
    // 交集：对于给定的两个集合，返回一个包含两个集合中共有元素的新集合。 
    // 差集：对于给定的两个集合，返回一个包含所有存在于第一个集合且不存在于第二个集
    // 合的元素的新集合。 
    // 子集：验证一个给定集合是否是另一集合的子集。
    this.union = function (otherSet) {
        const unionSet = new Set()
        let values = this.values();
        for (let i = 0; i < values.length; i++) {
            unionSet.add(values[i])
        }

        values = otherSet.values();
        for (let i = 0; i < values.length; i++) {
            unionSet.add(values[i])
        }

        return unionSet
    }

    this.intersection = function (otherSet) {
        const intersectionSet = new Set();
        let values = this.values()
        for (let i = 0; i < values.length; i++) {
            console.log(values[i]);
            if (otherSet.has(values[i])) {
                console.log(i);
                intersectionSet.add(values[i])
            }
        }
        return intersectionSet
    }
    this.difference = function (otherSet) {
        const differenceSet = new Set();
        let values = this.values()
        for (let i = 0; i < values.length; i++) {
            console.log(values[i]);
            if (!otherSet.has(values[i])) {
                console.log(i);
                differenceSet.add(values[i])
            }
        }
        return differenceSet
    }
    this.subset = function (otherSet) {
        if (this.size() > otherSet.size()) {
            return false
        } else {
            let values = this.values()
            for (let i = 0; i < values.length; i++) {
                if (!otherSet.has(values[i])) {
                    return false
                }
            }
            return true
        }
    }
}