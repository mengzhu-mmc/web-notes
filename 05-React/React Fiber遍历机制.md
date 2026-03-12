# React Fiber 遍历机制

## 遍历方式

React 生成 workInProgress 树采用**深度优先遍历（DFS）**，而非广度优先遍历。遵循 child（子节点，优先向下）→ sibling（兄弟节点，同层横向）→ return（父节点，回溯向上）的顺序。

## 遍历流程

```javascript
function performUnitOfWork(unitOfWork) {
  // 1. beginWork: 处理当前节点，创建子 Fiber
  let next = beginWork(current, unitOfWork, renderLanes);

  if (next === null) {
    // 2. 没有子节点，进入 complete 阶段
    completeUnitOfWork(unitOfWork);
  } else {
    // 3. 有子节点，继续向下遍历
    workInProgress = next;
  }
}

function completeUnitOfWork(unitOfWork) {
  let completedWork = unitOfWork;
  do {
    completeWork(completedWork);
    const siblingFiber = completedWork.sibling;
    if (siblingFiber !== null) {
      workInProgress = siblingFiber; // 有兄弟节点，处理兄弟
      return;
    }
    completedWork = completedWork.return; // 没有兄弟，回到父节点
    workInProgress = completedWork;
  } while (completedWork !== null);
}
```

对于树 `A → B(→D), C(→E)`，遍历顺序为：A → B → D → C → E。

## 为什么使用深度优先

符合组件树的结构特点（先处理子组件，再回到父组件），便于完成阶段从叶子节点向上回溯收集副作用，利于时间切片（可以在任意节点中断和恢复），内存效率高（只需维护当前工作路径，不需要队列存储所有同层节点）。
