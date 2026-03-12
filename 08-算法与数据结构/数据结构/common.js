 class ListNode {
  constructor(val, next) {
    this.val = val === undefined ? 0 : val;
    this.next = next === undefined ? null : val
  }
 } 

class LinkNodeList {
  
  constructor() {
    this.head = null
    this.length = 0
    return this.head
  }

  append(val) {
    // debugger
    const elm = new ListNode(val)
    if (!this.head) {
      this.head = elm;
    } else {
      let p = this.head;
      while(p.next) {
        p = p.next
      }
      p.next = elm
    }
    this.length++;
  }

  appendList(list) {
    if (!Array.isArray(list)) return;
    list.forEach(item => {
      this.append(item)
    })
  }

  // return this.head
}