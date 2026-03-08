/* 
    一、javascript 的 typeof 返回那些数据类型
     string number boolean undefined object function

    二、举例3种强制类型和2种隐式类型转换
    
     强制：parseInt(string, radix)  parseFloat Number

    parseInt 用法：
        parseInt("10");			//返回 10
        parseInt("19",10);		//返回 19 (10+9)
        parseInt("11",2);		//返回 3 (2+1)
        parseInt("17",8);		//返回 15 (8+7)
        parseInt("1f",16);		//返回 31 (16+15)
        parseInt("010");		//未定：返回 10 或 8

    parseFloat 用法：
        注意： 字符串中只返回第一个数字。
        注意： 开头和结尾的空格是允许的。
        注意： 如果字符串的第一个字符不能被转换为数字，那么 parseFloat() 会返回 NaN。
     
        document.write(parseFloat("34 45 66") + "<br>");  //=> 34
        document.write(parseFloat(" 60 ") + "<br>");      //=> 60
        document.write(parseFloat("40 years") + "<br>");  //=> 40
        document.write(parseFloat("He was 40") + "<br>"); //=> NaN
    
    Number 用法：
        如果参数是 Date 对象，Number() 返回从 1970 年 1 月 1 日至今的毫秒数。
        如果对象的值无法转换为数字，那么 Number() 函数返回 NaN。

        Number('')  => 0
        Number('3a') => NaN
        Number('3') => 3
        Number('1  3')=> NaN    
     隐式：==   ===
*/


// 函数声明优先于变量声明！
// alert(a); // undefined 
// a(); //       =>    a is not a function 程序报错，到此结束
// var a=3; 
// var a=function(){   // var 变量赋值，预解析只定义
//     alert(10)
// }   
// alert(a) 
// a=6; 
// a(); 

// ============================= 分割线

// alert(a) // function() { alert }
// a(); // 10
// var a=3;
// function a(){
//     alert(10)
// }   
// alert(a) //3
// a=6;
// a();  // a is not a function 程序报错，到此结束


// ============================= 分割线
// 在函数体内，参数a的优先级高于变量a
// var a=0;
// function aa(a){
//     alert(a)
//     var a=3
// }
// aa(5) // 5
// alert(a) // 0

// ============================= 分割线
// 在函数体内，执行alert(a)和a=3,修改的的并不是全局变量a，而是参数a
// var a=0;
// function aa(a){
//     alert(a)
//     a=3
// }
// aa(5) // 5
// alert(a) // 0
// // ============================= 分割线
// function foo1()
// {
//  return {
//      bar: "hello"
//  };
// }
 
// function foo2()
// {
//  return  // return 返回的数据必须和 return 写在一行，否则就返回undefined
//  {
//      bar: "hello"
//  };
// }
// var a=foo1();
// var b=foo2();
// console.log(a) //Object {bar: "hello"}
// console.log(b) //underfind
// ============================ 分割线
function Foo() {
    getName = function() { console.log(1) }
    return this
}
Foo.getName = function() { console.log(2) }
Foo.prototype.getName = function() { console.log(3) }
var getName = function() { console.log(4) }
function getName() { console.log(5) }
Foo.getName(); // 2
getName(); // 4
Foo().getName();// 4  xxx  => 1
getName();// 4 xxx => 1

// 点 比 new无参列表 的优先级高，所以相当于new (fn. getValue())
new Foo.getName(); // 2

// 函数调用和new有参数列表的优先级都是19，从左到右执行；
// 先执行实例化new fn()，所以 调用该实例对象的方法getValue指的是构造函数原型上的getValue方法，打印值为3。
new Foo().getName(); // xxx => 3

// new (new fn().getValue)()
new new Foo().getName();// xxx => 3