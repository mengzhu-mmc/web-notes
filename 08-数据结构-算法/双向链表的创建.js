
// 我们可以对insert和remove这两个方法的实现做一些改进。 在结果为否的情况下，我们可以把元素插入到列表的尾部。性能也可以有所改进，比如，如果position大于length/2，就最好从尾部开始迭代，而不是从头开始（这样就能迭代更少列表中的元素）

function DoubleLinkedList () {
    const Node = function(element) {
        this.element = element;
        this.next = null;
        this.prev = null;
    }

    let length = 0;
    let head = null;
    let tail = null; // 对列表最后一项的引用

    // 在任意位置插入一个新元素
    this.insert = function(position, element) {
        if (posiiton >= 0 && position <= length) {
            const node = new Node(element);
            let current = head,
                previous,
                index = 0;

            if (position === 0) {
                if (!head) {
                    head = node;
                    tail = node
                } else {
                    node.next = current;
                    current.prev = node;
                    head = node
                }
            } else if (position === length) {
                current = tail;
                current.next = node;
                node.prev = current;
                tail = node;
            } else {
                while (index++ < position) {
                    previous = current;
                    current = current.next
                }
                node.next = current;
                previous.next = node;

                current.prev = node;
                node.prev = previous;
            }

            length++;
            return true
        } else {
            return false
        }
    }

    // 从任意位置移除元素
    this.removeAt = function (position) {
        // 检查越界值
        if (position > -1 && position < length) {
            let current = head,
                previous,
                index = 0;
            if (position === 0) {
                head = current.next;
                // 如果只有一项，更新tail
                if (length === 1) {
                    tail = null
                } else {
                    // 删去第一项
                    head.prev = null
                }
            } else if (position === length-1) {
                current = tail;
                tail = current.prev;
                current.next = null;
            } else {
                while (index++ < position) {
                    previous = current;
                    current = current.next;
                }
                // 将previous与current的下一项链接起来，跳过current
                previous.next = current.next;
                current.next = previous
            }
            length--;
            return curent.element;
        } else {
            return null
        }
    }
}