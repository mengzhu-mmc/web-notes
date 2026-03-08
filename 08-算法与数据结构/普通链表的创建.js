    function LinkedList () {
        const Node = function(element) {
            this.element = element;
            this.next = null;
        }

        let length = 0;
        let head = null;
        // 向列表尾部添加一个新的项
        this.append = function(element) {
            const node = new Node(element);
            let current;
            if (head === null) {
                head = node
            } else {
                current = head;

                // 循环列表，知道找到最后一项
                while(current.next) {
                    current = current.next
                }

                // 找到最后一项，将其next赋为node，
                current.next = node;

                length++; // 更新列表长度
            }
        }; 

        // 向列表的特定位置插入一个新的项
        this.insert = function (position, element) {
            // 检查越界值
            if (position >= 0 && position <= length) {
                const node = new Node(element);
                let current = head,
                    previous,
                    index = 0;
                if (position === 0) {
                    node.next = current;
                    head = node
                } else {
                    while(index++ < position) {
                        previous = current;
                        current = current.next
                    }
                    previous.next = node;
                    node.next = current;
                }
                length++;

                return true
            } else {
                return false
            }
        };

        // 从列表的特定位置移除一项
        this.removeAt = function(position) {
            // 检查越界值
            if (position > -1 && position < length) {
                let current = head,
                    previous,
                    index = 0;
                if (position === 0) {
                    head = current.next
                } else {
                    while (index++ < position) {
                        previous = current;
                        current = current.next;
                    }
                    // 将 previous 与 current的下一项链接起来，跳过current，从而移除它
                    previous.next = current.next; 
                }
                length--;
                return current.element
            } else {
                return null
            }
        };
        
        // 返回元素在列表中的索引。如果列表中没有该元素则返回-1。
        this.indexOf = function(element) {
            let current = head,
                index = 0;
            while (current) {
                if (current.element === element) {
                    return index
                }
                index++;
                current = current.next; 
            }
            return -1
        };

        // 删除某个值
        this.remove = function(element) {
            const index = this.indexOf(element);
            return this.removeAt(index)
        }

        // 由于列表项使用了Node类，就需要重写继承自JavaScript对象默认的toString方法，让其只输出元素的值。
        this.toString = function() {
            let current = head,
                string = '';

            while(current) {
                string += current.element + ' - ';
                current = current.next;
            }

            return string
        };

        // 如果链表中不包含任何元素， 返回true， 如果链表长度大于0则返回false
        this.isEmpty = function() {
            return length === 0
        };

        // 返回链表包含的元素个数。与数组的length属性类似。
        this.size = function() {
            return length
        };
        
        this.getHead = function() {
            return head;
        }

        this.print = function() {}
    }
