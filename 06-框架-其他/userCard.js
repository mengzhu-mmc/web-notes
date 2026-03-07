     //  1. 自定义元素需要使用JS定义一个类或函数
     class UserCard extends HTMLElement {
        constructor() {
            super();

            // 将html模板注入网页中
            const template = document.createElement('template')
            template.innerHTML = `
            <!-- 
                <template>样式里面的:host伪类，指代自定义元素本身。
            -->
            <style>
                :host {
                  display: flex;
                  align-items: center;
                  width: 550px;
                  height: 180px;
                  background-color: #d4d4d4;
                  border: 1px solid #d5d5d5;
                  box-shadow: 1px 1px 5px rgba(0, 0, 0, 0.1);
                  border-radius: 3px;
                  overflow: hidden;
                  padding: 10px;
                  box-sizing: border-box;
                  font-family: 'Poppins', sans-serif;
                }
                .image {
                  flex: 0 0 auto;
                  width: 260px;
                  height: 160px;
                  vertical-align: middle;
                  border-radius: 5px;
                }
                .container {
                  box-sizing: border-box;
                  padding: 20px;
                  height: 160px;
                }
                .container > .name {
                  font-size: 20px;
                  font-weight: 600;
                  line-height: 1;
                  margin: 0;
                  margin-bottom: 5px;
                }
                .container > .email {
                  font-size: 12px;
                  opacity: 0.75;
                  line-height: 1;
                  margin: 0;
                  margin-bottom: 15px;
                }
                .container > .button {
                  padding: 10px 25px;
                  font-size: 12px;
                  border-radius: 5px;
                  text-transform: uppercase;
                }
            </style>
            <img src="" class="image" />
            <div class="container">
                <p class="name"></p>
                <p class="email"></p>
                <button class="button">Follow</button>
            </div>
            `
            // <template id="userCardTemplate">
            template.setAttribute('id', 'userCardTemplate')
            document.getElementsByTagName('body')[0].appendChild(template)
            
            // Web Component 允许内部代码隐藏起来，这叫做 Shadow DOM，即这部分 DOM 默认与外部 DOM 隔离，内部任何代码都无法影响外部
            // this.attachShadow()方法的参数{ mode: 'closed' }，表示 Shadow DOM 是封闭的，不允许外部访问。
            const shadow = this.attachShadow({ mode: 'closed' })
            
            const templateElem = document.getElementById('userCardTemplate');
            const content = templateElem.content.cloneNode(true);
            console.log(templateElem.content);
            console.log(templateElem);
            // console.log(templateElem === template); // true 元素挂载前后，地址不变
            content.querySelector('img').setAttribute('src', this.getAttribute('image'));
            content.querySelector('.container>.name').innerText = this.getAttribute('name');
            content.querySelector('.container>.email').innerText = this.getAttribute('email');

            // this.appendChild(content)  //=> this 指向实例
            shadow.appendChild(content)

            // 用户卡片是一个静态组件，如果要与用户互动，也很简单，就是在类里面监听各种事件
            // 必须在挂载之后绑定事件
            this.$button = shadow.querySelector('.button')
            this.$button.addEventListener('click', () => {
              console.log(666);
            })
        }
    }
    //  2.使用浏览器原生的customElements.define()方法，告诉浏览器<user-card>元素与这个类关联
    window.customElements.define('user-card', UserCard)