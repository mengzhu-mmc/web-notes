## script标签的defer和async属性

拿四个不同的颜色来标明各自代表的含义

**更正：文档渲染 应该为 文档解析**
<img src="./1.png">
### 普通script：
文档解析的过程中，如果遇到script脚本，就会停止页面的解析进行下载（但是Chrome会做一个优化，如果遇到script脚本，会快速的查看后边有没有需要下载其他资源的，如果有的话，会先下载那些资源，然后再进行下载script所对应的资源，这样能够节省一部分下载的时间 @Update: 2018-08-17）。

资源的下载是在解析过程中进行的，虽说script1脚本会很快的加载完毕，但是他前边的script2并没有加载&执行，所以他只能处于一个挂起的状态，等待script2执行完毕后再执行。
当这两个脚本都执行完毕后，才会继续解析页面。
<img src="./普通script.png">

### defer:
文档解析时，遇到设置了defer的脚本，就会在后台进行下载，但是并不会阻止文档的渲染，当页面解析&渲染完毕后。
会等到所有的defer脚本加载完毕并按照顺序执行，执行完毕后会触发DOMContentLoaded事件。
<img src="./defer.png">

### async
async脚本会在加载完毕后执行。
async脚本的加载不计入DOMContentLoaded事件统计，也就是说下图两种情况都是有可能发生的
<img src="./async1.png">
<img src="./async2.png">