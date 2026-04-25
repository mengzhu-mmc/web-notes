let MyModules = (function Manageer () {
    let modules = {};

    function define (name, deps, impl) {
        for(let i =0; i < deps.length; i++) {
            deps[i] = modules[deps[i]]
        }
        modules[name] = impl.apply(impl, deps);
    }

    function get(name) {
        return modules[name]
    }

    return {
        define,
        get
    }
})()

MyModules.define("bar", [], function () {
    function hello(who) {
        return "let me introduce:" + who;
    }
    return {
        hello
    }
})

MyModules.define("foo", ["bar"], function (bar) {
    let hungry = "hippo";

    function awesome () {
        console.log(bar.hello(hungry).toUpperCase());
    }

    return {
        awesome
    }
})
let bar = MyModules.get("bar")
let foo = MyModules.get("foo")
console.log(
    bar.hello("hippo")
)
foo.awesome()