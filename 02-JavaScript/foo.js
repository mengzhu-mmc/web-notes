/* node 里面是 require 导入 ！！！ */
import bar from "./bar.js"

let hungry = "hippo";

/* awesome --->  令人惊叹的 */
function awesome(hungry) {
    console.log(bar.hello(hungry).toUpperCase())
}
export default {
    awesome
}