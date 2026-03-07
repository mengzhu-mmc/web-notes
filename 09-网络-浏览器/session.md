### session认证流程

1. 浏览器登陆发送账号和密码，服务器查数据库校验
2. 把用户登陆状态存为session，生成一个sessionId，并将sessionId返回，存储在cookie中
3. 此后浏览器在请求接口，sessionId在Cookie中被自动传递到服务端
4. 服务端查 sessionId校验session
5. 成功后正常做业务处理



### Session 的存储方式

显然，服务端只是给 cookie 一个 sessionId，而 session 的具体内容（可能包含用户信息、session 状态等），要自己存一下。存储的方式有几种：

- Redis（推荐）：内存型数据库，[redis中文官方网站](https://link.juejin.cn?target=http%3A%2F%2Fwww.redis.cn%2F)。以 key-value 的形式存，正合 sessionId-sessionData 的场景；且访问快。
- 内存：直接放到变量里。一旦服务重启就没了
- 数据库：普通数据库。性能不高

### Session 的分布式问题

通常服务端是集群，而用户请求过来会走一次负载均衡，不一定打到哪台机器上。那一旦用户后续接口请求到的机器和他登录请求的机器不一致，或者登录请求的机器宕机了，session 不就失效了吗？

这个问题现在有几种解决方式。

- 一是从「存储」角度，把 session 集中存储。如果我们用独立的 Redis 或普通数据库，就可以把 session 都存到一个库里。
- 二是从「分布」角度，让相同 IP 的请求在负载均衡时都打到同一台机器上。以 nginx 为例，可以配置 ip_hash 来实现。

但通常还是采用第一种方式，因为第二种相当于阉割了负载均衡，且仍没有解决「用户请求的机器宕机」的问题。



### session和cookie的区别

* 安全性：session比cookie安全，session存储在服务器，cookie存在客户端
* 存取值的类型不同：Cookie 只支持存字符串数据，想要设置其他类型的数据，需要将其转换成字符串，Session 可以存任意数据类型。
* 有效期不同：cookie可以长时间保持，但是session一般失效事件短，默认客户端关闭就失效了
* 存储大小不同：单个 Cookie 保存的数据不能超过4K，Session 可存储数据远高于 Cookie，但是当访问量过多，会占用过多的服务器资源。