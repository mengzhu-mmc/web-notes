class Node {
    constructor(key) {
        this.key = key
        this.left = null
        this.right = null
    }
}

/* class BinarySearchTree {
    constructor() {
        this.root = null
    }

    insert(key) {
        // 1.根据 key 创建node节点
        const newNode = new Node(key);
        
        if (this.root === null) {
            this.root = newNode
        } else {    
            this.insertNode(this.root, newNode)
        }

    }

    // 把newNode插在node上
    insertNode(node, newNode) {
        if (newNode.key > node.key) {
            if (node.right === null) {
                node.right = newNode
            } else {
                this.insertNode(node.right, newNode)
            }
        } else {
            if (node.left === null) {
                node.left = newNode
            } else {
                this.insertNode(node.left, newNode)
            }
        }
    }

    // 先序遍历
    preOverTraverse() {
        this.preOverTraverseNode(this.root)
    }
    preOverTraverseNode(node) {
        if (node === null) return;

        console.log(node.key);
        this.preOverTraverseNode(node.left)
        this.preOverTraverseNode(node.right)
    }
    // 中序遍历
    inOrderTraverse() {
        this.inOrderTraverseNode(this.root)
    }
    inOrderTraverseNode(node) {
        if (node === null) return;
        this.inOrderTraverseNode(node.left)
        console.log(node.key);
        this.inOrderTraverseNode(node.right)
    }
}
 */

// class BinarySearchTree {
//     constructor() {
//         this.root = null
//     }
//     insert(key) {
//         if (!this.root) this.root = new Node(key) 
//         else this.insertNode(this.root, new Node(key))
//     }

//     insertNode(node, newNode) {
//         if (newNode.key > node.key) {
//             if (!node.right) {
//                 node.right = newNode
//             } else {
//                 this.insertNode(node.right, newNode)
//             }
//         } else {
//             if (!node.left) {
//                 node.left = newNode
//             } else {
//                 this.insertNode(node.left, newNode)
//             }
//         }
//     }
// }

function TreeNode(val, left, right) {
    this.val = val
    this.left = (left === undefined ? null : left)
    this.right = (right === undefined ? null : left)
}

function sortArrayToBST(arr) {
    if(arr.length == 0) return null;
    const mid = Math.floor(arr.length / 2)
    const root = new TreeNode(mid)
    root.left = sortArrayToBST(arr.slice(0, mid))
    root.right = sortArrayToBST(arr.slice(mid+1, arr.length))
    return root
}
