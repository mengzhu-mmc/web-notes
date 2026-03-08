一、减少DOM数量的方法

1. 可以使用伪元素实现的内容尽量不使用DOM实现



二、大量DOM时的优化

1. ​        缓存DOM对象：不管在什么场景下。操作Dom一般首先会去访问Dom，尤其是像循环遍历这种事件复杂度可能会比较高的操作/那么可以在循环之前就将主节点，不必循环的Dom节点先获取到，那么在循环里就可以世界引用，而不必去重新查询。

    ```js
    let root = document.querySelector('a');
    let childList = root.child;
    for(let i=0;i<childList.length;i++){
       //执行操作
    }
    ```

2. ​        利用 document.cerateDocumentFragment() 方法创建文档碎片节点，创建的是一个虚拟的节点对象。向这个节点添加dom节点，修改dom节点并不会影响到真实的dom结构。

    ​        我们可以利用这一点先将我们需要修改的dom一并修改完，保存至文档碎片中，然后用文档碎片一次性的替换真实的dom节点。与虚拟dom类似，同样达到了不频繁修改dom而导致的重排更重绘的过程。

    ```javascript
    let fragment = document.certaeDocumentFragment();
    const operationDomHandle = (fragment) =>{
         //操作
    }
    operationDomHandle(fragment);
    //然后最后再替换
    rootElem.replaceChild(fragment,oldDom);
    ```

3. 虚拟Dom
          js模似DOM树并对DOM树操作的一种技术。virtual DOM是一个纯js对象（字符串对象），所以对他操作会高效。

    ​      利用virtual dom，将dom抽象为虚拟dom，在dom发生变化的时候县对虚拟dom进行 操作，通过dom diff算法将虚拟dom和原虚拟dom的结构做对比，最终批量的去修该真实的dom结构，尽可能的避免了频繁修改dom而导致的频繁的重排和重绘。

​           









































