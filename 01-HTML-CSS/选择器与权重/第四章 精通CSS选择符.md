		CSS选择符目前有下面这几个：后代选择符空格（ ）、子选择符箭头（`>`）、相邻兄弟选择符加号（`+`）、随后兄弟选择符弯弯（`~`）和列选择符双管道（`||`）。其中对于前4个选择符，浏览器支持的时间较早，非常实用，是本章的重点。最后的列选择符算是“新贵”，与Table等布局密切相关，但目前浏览器的兼容性还不足以使它被实际应用，因此就简单介绍下。

## 4.1 后代选择符空格( )

后代选择符是非常常用的选择符，随手抓一个线上的CSS文件就可以看到这个选择符，它从IE6时代就开始被支持了。但即使天天见，也不见得真的很了解它。

#### 4.1.1 对CSS后代选择符可能错误的认知

看这个例子，HTML和CSS代码分别如下：

```
<div class="lightblue"> <div class="darkblue"> <p>1. 颜色是？</p> </div> </div> 
<div class="darkblue"> <div class="lightblue"> <p>2. 颜色是？</p> </div> </div> 
.lightblue { color: lightblue; } .darkblue { color: darkblue; }
```

请问文字的颜色是什么？

这个问题比较简单，因为`color`具有继承特性，所以文字的颜色由DOM最深的赋色元素决定，因此1和2的颜色分别是深蓝色和浅蓝色，如图4-1所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/-HURQUvIZW7Xy4DdyF3-76taRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/17.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

但是，如果把这里的类选择器换成后代选择符，那就没这么简单了，很多人会搞错最终呈现的文字颜色：

```
<div class="lightblue"> <div class="darkblue"> <p>1. 颜色是？</p> </div> </div> 
<div class="darkblue"> <div class="lightblue"> <p>2. 颜色是？</p> </div> </div> 
.lightblue p { color: lightblue; } .darkblue p { color: darkblue; }
```

早些年我拿这道题作为面试题，全军覆没，无人答对，大家都认为结果是深蓝色和浅蓝色，实际上不是，正确答案是，1和2全部都是深蓝色，如图4-2所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/-HURQUvIZW7Xy4DdyF3-76taRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/19.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

很多人会搞错的原因就在于他们对后代选择符有错误的认识，当包含后代选择符的时候，整个选择器的优先级与祖先元素的DOM层级没有任何关系，这时要看落地元素的优先级。在本例中，落地元素就是最后的``元素。两个``元素彼此分离，非嵌套，因此DOM层级平行，没有先后；再看选择器的优先级，`.lightblue p`和`.darkblue p`是一个类选择器（数值`10`）和一个标签选择器（数值1），选择器优先级的计算值一样；此时就要看它们在CSS文件中的位置，遵循“后来居上”的规则，由于`.darkblue p`更靠后，因此，<p>都是按照`color:darkblue`进行颜色渲染的，于是，最终1和2的文字颜色全部都是深蓝色。

如果觉得已经理解了，可以看看下面这两段CSS语句，算是一个小测验。

**例1**：此时1和2的文字颜色是什么？

```
:not(.darkblue) p { color: lightblue; } .darkblue p { color: darkblue; }
```

答案：1和2的文字颜色也同样都是`darkblue（`深蓝色）。因为`:not()`本身的优先级为0（详见第2章），所以`:not(.darkblue) p`和`.darkblue p`的优先级计算值是一样的，遵循“后来居上”的规则，`.darkblue p`位于靠后的位置，因此1和2的文字颜色都是深蓝色。

**例2**：此时1和2的文字颜色是什么？

```
.lightblue.lightblue p { color: lightblue; } .darkblue p { color: darkblue; }
```

答案：1和2的文字颜色都是`lightblue（`浅蓝色）。因为选择器`.lightblue.lightblue p`的优先级更高。

#### 4.1.2 对JavaScript中后代选择符可能错误的认知

直接看例子，HTML如下：

```html
<div id="myId">
	<div class="lonely">单身如我</div> 
	<div class="outer">
		<div class="inner">内外开花</div>、
	</div>
</div>
```

下面使用JavaScript和后代选择器获取元素，请问下面两行语句的输出结果分别是：

```javascript
// 1. 长度是？ document.querySelectorAll('#myId div div').length; // 2. 长度是? document.querySelector('#myId').querySelectorAll('div div').length;
```

很多人会认为这两条语句返回的长度都是1，实际上不是，它们返回的长度值分别是1和3！

图4-3是我在浏览器控制台测试出来的结果。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/-HURQUvIZW7Xy4DdyF3-76taRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/21.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-3　JavaScript后代选择器获取的元素的长度

第一个结果符合我们的理解，不解释。为何下一个语句返回的`NodeList的`长度是3呢？

其实这很好解释，一句话：CSS选择器是独立于整个页面的！

什么意思呢？例如，你在页面一个很深的DOM元素里面写上：

```
<style> div div { } </style>
```

整个网页，包括父级，只要是满足`div div`这种后代关系的元素，全部都会被选中，对吧，这点大家都清楚的。

`querySelectorAll`里面的选择器同样也是全局特性。`document.querySelector('#myId').querySelectorAll('div div')`翻译过来的意思就是：查询`#myId`元素的子元素，选择所有同时满足整个页面下`div div`选择器条件的DOM元素。

此时我们再仔细看看原始的HTML结构会发现，在全局视野下，`div.lonely、div.outer、div.inner`全部都满足`div div`这个选择器条件，于是，最终返回的长度为3。如果我们在浏览器控制台输出所有`NodeList`，也是这个结果：

```
NodeList(3) [div.lonely, div.outer, div.inner]
```

这就是对JavaScript中后代选择符可能错误的认识。

其实，要想querySelectorAll后面的选择器不是全局匹配，也是有办法的，可以使用`:scope`伪类，其作用就是让CSS选择器的作用域局限在某一范围内。例如，可以将上面的例子改成下面这样：

```
// 3. 长度是？ document.querySelector('#myId').querySelectorAll(':scope div div').length;
```

则最终的结果就是1，如图4-4所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/-HURQUvIZW7Xy4DdyF3-76taRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/22.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-4　`:scope`伪类下获取的元素的长度

关于`:scope`伪类的更多内容，可以参见第12章。

## 4.2 子选择符箭头 (>)

子选择符也是非常常用、非常重要的一个选择符，IE7浏览器开始支持，和后代选择符空格有点“远房亲戚”的感觉。

#### 4.2.1 子选择符和后代选择符的区别

子选择符只会匹配第一代子元素，而后代选择符会匹配所有子元素。

看一个例子，HTML结构如下：

```html
<ol> 
    <li>颜色是？</li> 
    <li>颜色是？ 
        <ul> 
    		<li>颜色是？</li> 
    		<li>颜色是？</li> 
   		</ul> 
    </li> 
    <li>颜色是？</li> 
</ol>
```

CSS如下：

```
ol li { color: darkblue; text-decoration: underline; } 
ol > li { color: lightblue; text-decoration: underline wavy; }
```

​		由于父子元素不同的`text-decoration`属性值会不断累加，因此我们可以根据下划线的类型准确判断出不同选择符的作用范围。最终的结果如图4-5所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/-HURQUvIZW7Xy4DdyF3-76taRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/23.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-5　子选择符和后代选择符的测试结果截图

​		可以看到，外层所有文字的下划线都只有波浪类型，而内层文字的下划线是实线和波浪线的混合类型。而实线下划线是`ol li`选择器中的`text-decoration:underline`声明产生的，波浪线下划线是`ol>li`选择器中的`text-decoration:underline wavy`声明产生的，这就说明，`ol>li`只能作用于当前子``元素，而`ol li`可以作用于所有的后代``元素。

以上就是这两个选择符的差异。显然后代选择符的匹配范围要比子选择符的匹配范围更广，因此，同样的选择器下，子选择符的匹配性能要优于后代选择符。但这种性能优势的价值有限，几乎没有任何意义，因此不能作为选择符技术选型的优先条件。

#### 4.2.2 适合使用子选择符的场景

能不用子选择符就尽量不用，虽然它的性能优于后代选择符，但与其日后带来的维护成本比，这实在不值一提。

举个例子，有一个模块容器，类名是`.cs-module-x`，这个模块在*A*区域和*B*区域的样式有一些差异，需要重置，我们通常的做法是给容器外层元素重新命名一个类进行重置，如`.cs-module-reset-b`，此时，很多开发者（也没想太多）就使用了子选择符：

```
.cs-module-reset-b > .cs-module-x { width: fit-content; }
```

作为过来人，建议大家使用后代选择符代替：

```
/* 建议 */ .cs-module-reset-b .cs-module-x { position: absolute; }
```

因为一旦使用了子选择符，元素的层级关系就被强制绑定了，日后需要维护或者需求发生变化的时候一旦调整了层级关系，整个样式就失效了，这时还要对CSS代码进行同步调整，增加了维护成本。

记住：使用子选择符的主要目的是避免冲突。本例中，`.cs-module-x`容器内部不可能再有一个`.cs-module-x`，因此使用后代选择符绝对不会出现冲突问题，反而会让结构变得更加灵活，就算日后再嵌套一层标签，也不会影响布局。

适合使用子选择符的场景通常有以下几个。

（1）状态类名控制。例如使用`.active`类名进行状态切换，会遇到祖先和后代都存在`.active`切换的场景，此时子选择符是必需的，以免影响后代元素，例如：

```
.active > .cs-module-x { display: block; }
```

（2）标签受限。例如当``标签重复嵌套，同时我们无法修改标签名称或者设置类名的时候（例如WordPress中的第三方小工具），就需要使用子选择符进行精确控制。

```
.widget > li {} .widget > li li {}
```

3）层级位置与动态判断。例如一个时间选择组件的HTML通常会放在`<body>`元素下，作为`<body>`的子元素，以绝对定位浮层的形式呈现。但有时候其需要以静态布局嵌在页面的某个位置，这时如果我们不方便修改组件源码，则可以借助子选择符快速打一个补丁：

```
:not(body) > .cs-date-panel-x { position: relative; }
```

意思就是当组件容器不是`<body>`子元素的时候取消绝对定位。

子选择符就是把双刃剑，它通过限制关系使得结构更加稳固，但同时也失去了弹性和变化，需要审慎使用。

## 相邻兄弟选择符加号(+)

相邻兄弟选择符也是非常实用的选择符，IE7及以上版本的浏览器支持，它可以用于选择相邻的兄弟元素，但只能选择后面一个兄弟。我们将通过一个简单的例子快速了解一下相邻兄弟选择符，HTML和CSS如下：

```
<ol> <li>1. 颜色是？</li> <li class="cs-li">2. 颜色是？</li> <li>3. 颜色是？</li> <li>4. 颜色是？</li> </ol> .cs-li + li { color: skyblue; }
```

结果如图4-6所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/25.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-6　相邻兄弟选择符测试结果截图

可以看到，`.cs-li`后面一个``的颜色变成天蓝色了，结果符合我们的预期，因为`.cs-li+li`表示的就是选择`.cs-li`元素后面一个相邻且标签是`li`的元素。如果这里的选择器是`.cs-li+p`，则不会有元素被选中，因为`.cs-li`后面是``元素，并不是`<p>`元素。

#### 4.3.1 相邻兄弟选择符的相关细节

实际开发时，我们的HTML不一定都是整整齐齐的标签元素，此时，相邻兄弟选择符又当如何表现呢？

#### 1．文本节点与相邻兄弟选择符

CSS很简单：

```
h4 + p { color: skyblue; }
```

然后我们在`<h4>`和`<p>`元素之间插入一些文字，看看`<p>`元素的颜色是否还是天蓝色？

```
<h4>1. 文本节点</h4> 中间有字符间隔，颜色是？ <p>如果其颜色为天蓝，则说明相邻兄弟选择符忽略了文本节点。</p>
```

结果如图4-7所示，`<p>`元素的颜色依然为天蓝，这说明相邻兄弟选择符忽略了文本节点。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/27.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-7　相邻兄弟选择符忽略文本节点效果截图

#### 2．注释节点与相邻兄弟选择符

CSS很简单：

```
h4 + p { color: skyblue; }
```

然后我们在`<h4>`和`<p>`元素之间插入一段注释，看看`<p>`元素的颜色是否还是天蓝色？

```
<h4>2. 注释节点</h4> <!-- 中间有注释间隔，颜色是？ --> <p>如果其颜色为天蓝，则说明相邻兄弟选择符忽略了注释节点。</p>
```

结果如图4-8所示，`<p>`元素的颜色依然为天蓝，说明相邻兄弟选择符忽略了注释节点。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/28.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-8　相邻兄弟选择符忽略注释节点效果截图

由此，我们可以得到关于相邻兄弟选择符的更多细节知识，即相邻兄弟选择符会忽略文本节点和注释节点，只认元素节点。

#### 4.3.2 实现类似 :first-child 的效果

相邻兄弟选择符可以用来实现类似`:first-child`的效果。

例如，我们希望除了第一个列表以外的其他列表都有`margin-top`属性值，首先想到就是`:first-child`伪类，如果无须兼容IE8浏览器，可以这样实现：

```
.cs-li:not(:first-child) { margin-top: 1em; }
```

如果需要兼容IE8浏览器，则可以分开处理：

```
.cs-li { margin-top: 1em; } .cs-li:first-child { margin-top: 0; }
```

下面介绍另外一种方法，那就是借助相邻兄弟选择符，如下：

```
.cs-li + .cs-li { margin-top: 1em; }
```

由于相邻兄弟选择符只能匹配后一个元素，因此第一个元素就会落空，永远不会被匹配，于是自然而然就实现了非首列表元素的匹配。

实际上，此方法相比`:first-child`的适用性更广一些，例如，当容器的第一个子元素并非`.cs-li`的时候，相邻兄弟选择符这个方法依然有效，但是`:first-child`此时却无效了，因为没有任何`.cs-li`元素是第一个子元素了，无法匹配`:first-child`。用事实说话，有如下HTML：

```
<div class="cs-g1"> 
    <h4>使用:first-child实现</h4> 
    <p class="cs-li">列表内容1</p> 
    <p class="cs-li">列表内容2</p> 
    <p class="cs-li">列表内容3</p> 
</div> 
<div class="cs-g2"> 
    <h4>使用相邻兄弟选择符实现</h4> 
    <p class="cs-li">列表内容1</p> 
    <p class="cs-li">列表内容2</p> 
    <p class="cs-li">列表内容3</p> 
</div>
```

`.cs-g1`和`.cs-g2`中的`.cs-li`分别使用了不同的方法实现，如下：

```
.cs-g1 .cs-li:not(:first-child) { color: skyblue; } .cs-g2 .cs-li + .cs-li { color: skyblue; }
```

对比测试，结果如图4-9所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/30.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-9　使用`:first-child`与相邻兄弟选择符得到的测试结果对比

可以明显看到，相邻兄弟选择符实现的方法第一个列表元素的颜色依然是黑色，而非天蓝色，说明正确匹配了非首列表元素，而:first-child的所有列表元素都是天蓝色，匹配失败。可见，相邻兄弟选择符的适用性要更广一些。

#### 4.3.3 众多高级选择器技术的核心

相邻兄弟选择符最硬核的应用还是配合诸多伪类低成本实现很多实用的交互效果，是众多高级选择器技术的核心。

举个简单的例子，当我们聚焦输入框的时候，如果希望后面的提示文字显示，则可以借助相邻兄弟选择符轻松实现，原理很简单，把提示文字预先埋在输入框的后面，当触发focus行为的时候，让提示文字显示即可，HTML和CSS如下：

```
用户名：<input><span class="cs-tips">不超过10个字符</span> .cs-tips { color: gray; margin-left: 15px; position: absolute; visibility: hidden; } :focus + .cs-tips { visibility: visible; }
```

无须任何JavaScript代码参与，效果如图4-10所示，上图为失焦时候的效果图，下图为聚焦时候的效果图。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/32.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-10　失焦和聚焦时候的效果图

## 4.4  随后兄弟选择符弯弯(~)

随后兄弟选择符和相邻兄弟选择符的兼容性一致，都是从IE7浏览器开始支持的，可以放心使用。两者的实用性和重要程度也是类似的，总之它们的关系较近，有点远房亲戚的味道。

#### 4.4.1 和相邻兄弟选择符区别

相邻兄弟选择符只会匹配它后面的第一个兄弟元素，而随后兄弟选择符会匹配后面的所有兄弟元素。

看一个例子，HTML结构如下：

```
<p class="cs-li">列表内容1</p> <h4 class="cs-h">标题</h4> <p class="cs-li">列表内容2</p> <p class="cs-li">列表内容3</p>
```

CSS如下：

```
.cs-h ~ .cs-li { color: skyblue; text-decoration: underline; } .cs-h + .cs-li { text-decoration: underline wavy; }
```

最终的结果如图4-11所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/34.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-11　相邻兄弟选择符和随后兄弟选择符测试结果对比

可以看到`.cs-h`后面的所有`.cs-li`元素的文字的颜色都变成了天蓝色，但是只有后面的第一个`.cs-li`元素才有波浪线。这就是相邻兄弟选择符和随后兄弟选择符的区别，匹配一个和匹配后面全部的元素。

因此，同选择器条件下，相邻兄弟选择符的性能要比随后兄弟选择符高一些，但是，在CSS中，没有一定的数量级，谈论选择器的性能是没有意义的，因此，关于性能的权重大家可以看淡一些。

至于其他细节，两者是类似的，例如，随后兄弟选择符也会忽略文本节点和注释节点。

#### 4.4.2 为什么没有前面兄弟选择符

我们可以看到，无论是相邻兄弟选择符还是随后兄弟选择符，它们都只能选择后面的元素，我第一次认识这两个选择符的时候，就有这么一个疑问：为什么没有前面兄弟选择符？

后来我才明白，没有前面兄弟选择符和没有父元素选择符的原因是一样的，它们都受制于DOM渲染规则。

浏览器解析HTML文档是从前往后，由外及里进行的，所以我们时常会看到页面先出现头部然后再出现主体内容的情况。

但是，如果CSS支持了前面兄弟选择符或者父元素选择符，那就必须要等页面所有子元素加载完毕才能渲染HTML文档。因为所谓“前面兄弟选择符”，就是后面的DOM元素影响前面的DOM元素，如果后面的元素还没被加载并处理，又如何影响前面的元素样式呢？如果CSS真的支持这样的选择符，网页呈现速度必然会大大减慢，浏览器会出现长时间的白板，这会造成不好的体验。

有人可能会说，依然强制采取加载到哪里就渲染到哪里的策略呢？这样做会导致更大的问题，因为会出现加载到后面的元素的时候，前面的元素已经渲染好的样式会突然变成另外一个样式的情况，这也会造成不好的体验，而且会触发强烈的重排和重绘。

实际上，现在规范文档有一个伪类`:has`可以实现类似父选择器和前面选择器的效果，且这个伪类2013年就被提出过，但是这么多年过去了，依然没有任何浏览器实现相关功能。在我看来，就算再过5到10年，CSS支持“前面兄弟选择符”或者“父选择符”的可能性也很低，这倒不是技术层面上实现的可能性较低，而是CSS和HTML本身的渲染机制决定了这样的结果。

#### 4.4.3 如何实现前面兄弟选择符的效果

但是我们在实际开发的时候，确实存在很多场景需要控制前面的兄弟元素，此时又该怎么办呢？

兄弟选择符只能选择后面的元素，但是这个“后面”仅仅指代码层面的后面，而不是视觉层面的后面。也就是说，我们要实现前面兄弟选择符的效果，可以把这个“前面的元素”的相关代码依然放在后面，但是视觉上将它呈现在前面就可以了。

DOM位置和视觉位置不一致的实现方法非常多，常见的如`float`浮动实现，`absolute`绝对定位实现，所有具有定位特性的CSS属性（如`margin`、`left/top/right/bottom`以及`transform`）也可以实现。更高级点的就是使用`direction`或者`writing-mode`改变文档流顺序。在移动端，我们还可以使用Flex布局，它可以帮助我们更加灵活地控制DOM元素呈现的位置。

用实例说话，例如，我们要实现聚焦输入框时，前面的描述文字“用户名”也一起高亮显示的效果，如图4-12所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/36.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-12　输入框聚焦，前面文字高亮显示的效果图

下面给出4种不同的方法来实现这里的前面兄弟选择符效果。

（1）Flex布局实现。Flex布局中有一个名为`flex-direction的`属性，该属性可以控制元素水平或者垂直方向呈现的顺序。

HTML和CSS代码如下：

```
<div class="cs-flex"> <input class="cs-input"><label class="cs-label">用户名：</label> </div> .cs-flex { display: inline-flex; flex-direction: row-reverse; } .cs-input { width: 200px; } .cs-label { width: 64px; } :focus ~ .cs-label { color: darkblue; text-shadow: 0 0 1px; }
```

这一方法主要通过`flex-direction:row-reverse`调换元素的水平呈现顺序来实现DOM位置和视觉位置的不一样。此方法使用简单，方便快捷，唯一的问题是兼容性，用户群是外部用户的桌面端网站项目慎用，移动端无碍。

（2）`float`浮动实现。通过让前面的`<input>`输入框右浮动就可以实现位置调换了。

HTML和CSS代码如下：

```
<div class="cs-float"> <input class="cs-input"><label class="cs-label">用户名：</label> </div> .cs-float { width: 264px; } .cs-input { float: right; width: 200px; } .cs-label { display: block; overflow: hidden; } :focus ~ .cs-label { color: darkblue; text-shadow: 0 0 1px; }
```

这一方法的兼容性极佳，但仍有不足，首先就是容器宽度需要根据子元素的宽度计算，当然，如果无须兼容IE8，配合`calc()`计算则没有这个问题；其次就是不能实现多个元素的前面选择符效果，这个比较致命。

（3）`absolute`绝对定位实现。这个很好理解，就是把后面的`<label>`绝对定位到前面就好了。

HTML和CSS代码如下：

```
<div class="cs-absolute"> <input class="cs-input"><label class="cs-label">用户名：</label> </div> .cs-absolute { width: 264px; position: relative; } .cs-input { width: 200px; margin-left: 64px; } .cs-label { position: absolute; left: 0; } :focus ~ .cs-label { color: darkblue; text-shadow: 0 0 1px; }
```

这一方法的兼容性不错，也比较好理解。缺点是当元素较多的时候，控制成本比较高。

（4）`direction`属性实现。借助`direction`属性改变文档流的顺序可以轻松实现DOM位置和视觉位置的调换。

HTML和CSS代码如下：

```
<div class="cs-direction"> <input class="cs-input"><label class="cs-label">用户名：</label> </div> /* 水平文档流顺序改为从右往左 */ .cs-direction { direction: rtl; } /* 水平文档流顺序还原 */ .cs-direction .cs-label, .cs-direction .cs-input { direction: ltr; } .cs-label { display: inline-block; } :focus ~ .cs-label { color: darkblue; text-shadow: 0 0 1px; }
```

这一方法可以彻底改变任意个数内联元素的水平呈现位置，兼容性非常好，也容易理解。唯一不足就是它针对的必须是内联元素，好在本案例的文字和输入框就是内联元素，比较适合。

大致总结一下这4种方法，Flex方法适合多元素、块级元素，有一定的兼容性问题；`direction`方法也适合多元素、内联元素，没有兼容性问题，由于块级元素也可以设置为内联元素，因此，`direction`方法理论上也是一个终极解决方法；`float`方法和`absolute`方法虽然比较适合小白开发，也没有兼容性问题，但是不太适合多个元素，比较适合两个元素的场景。大家可以根据自己项目的实际场景选择合适的方法。

当然，不止上面4种方法，我们一个`margin`定位也能实现类似的效果，这里就不一一展开了。

## 4.5 快速了解列选择符双管道（||）

列选择符是规范中刚出现不久的新选择符，目前浏览器的兼容性还不足以让它在实际项目中得到应用，因此我仅简单介绍一下，让大家知道它大致是干什么用的。

Table布局和Grid布局中都有列的概念，有时候我们希望控制整列的样式，有两种方法：一种是借助`:nth-col()`或者`:nth-last-col()`伪类，不过目前浏览器尚未支持这两个伪类；还有一种是借助原生Table布局中的和元素实现，这个方法的兼容性非常好。

我们通过一个简单的例子快速了解一下这两个元素。例如，表格的HTML代码如下：

```
<table border="1" width="600"> <colgroup> <col> <col span="2" class="ancestor"> <col span="2" class="brother"> </colgroup> <tr> <td> </td> <th scope="col">后代选择符</th> <th scope="col">子选择符</th> <th scope="col">相邻兄弟选择符</th> <th scope="col">随后兄弟选择符</th> </tr> <tr> <th scope="row">示例</th> <td>.foo .bar {}</td> <td>.foo > .bar {}</td> <td>.foo + .bar {}</td> <td>.foo ~ .bar {}</td> </tr> </table>
```

可以看出表格共有5列。其中，元素中有3个元素，从`span`属性值可以看出，这3个元素分别占据1列、2列和2列。此时，我们给后面2个元素设置背景色，就可以看到背景色作用在整列上了。CSS如下：

```
.ancestor { background-color: dodgerblue; } .brother { background-color: skyblue; }
```

最终效果如图4-13所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/38.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-13　表格中的整列样式控制

但是有时候我们的单元格并不正好属于某一列，而是跨列，此时，元素会忽略这些跨列元素。举个例子：

```
<table border="1" width="200"> <colgroup> <col span="2"> <col class="selected"> </colgroup> <tbody> <tr> <td>A</td> <td>B</td> <td>C</td> </tr> <tr> <td colspan="2">D</td> <td>E</td> </tr> <tr> <td>F</td> <td colspan="2">G</td> </tr> </tbody> </table> col.selected { background-color: skyblue; }
```

此时仅`C`和`E`两个单元格有天蓝色的背景色，`G`单元格虽然也覆盖了第三列，但由于它同时也属于第二列，因此被无视了，效果如图4-14所示。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/39.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)



图4-14　`G`单元格没有背景色

这就有问题了。很多时候，我们就是要`G`单元格也有背景色，只要包含该列，都认为是目标对象。为了应对这种需求，列选择符应运而生。

列选择符写作双管道（`||`），是两个字符，和JavaScript语言中的逻辑或的写法一致，但是，在CSS中却不是“或”的意思，用“属于”来解释要更恰当。

通过如下CSS选择器，可以让`G`单元格也有背景色：

```
col.selected || td { background-color: skyblue; }
```

`col.selected || td`的含义就是，选择所有属于`col.selected`的`元素，哪怕这个`元素横跨多个列。

于是，就可以看到图4-15所示的效果。

![img](https://ptpress.keledge.com:50002/transfer/dcd/net/filetransfer/mmQqneR1Gaoe9jFeUXk2kqtaRS-OkuAWBOMSMCuiJfB9dtb4vei1rLodFOE7p-hp59N5LMrTc3uUFpO7r7BiL-ayvfZ8HyTNdbIQ4rWzjsqIArlOVhhD4A5vabXehMV9/Images/40.png?width=700&quality=100&mode=min&x-oss-process=resize,w_700)

图4-15　`G`单元格有背景色