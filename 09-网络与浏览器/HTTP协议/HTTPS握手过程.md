# HTTPS 握手过程

## 面试高频考点

- HTTPS 握手的完整流程？
- 为什么需要三个随机数来生成会话密钥？
- RSA 和 ECDHE 密钥交换的区别？什么是前向安全性？

---

## 一、基于 RSA 的 TLS 握手流程

### 1. Client Hello（客户端问候）

客户端发送支持的 TLS 版本、加密套件列表，以及一个随机数 `Client_Random`。

### 2. Server Hello（服务端问候）

服务端返回选择的 TLS 版本、确认使用的加密套件、证书（含公钥），以及一个随机数 `Server_Random`。

### 3. Client Key Exchange（客户端密钥交换）

客户端验证证书的合法性（CA 签名、有效期、域名匹配等），然后生成一个随机的 `Pre_Master_Secret`（预主密钥），使用服务端的公钥加密后发送给服务端。服务端用私钥解密得到 `Pre_Master_Secret`。

### 4. Session Key Generation（生成会话密钥）

双方都拥有了三个关键信息：`Client_Random`、`Server_Random` 和 `Pre_Master_Secret`。使用相同的伪随机函数（PRF）算法生成最终的 `Master_Secret`，进而衍生出对称加密的 `Session_Key`。

```
Master_Secret = PRF(Pre_Master_Secret, "master secret", Client_Random + Server_Random)
```

## 二、为什么需要三个随机数？

**防重放攻击：** `Client_Random` 和 `Server_Random` 每次握手都不同，保证每次生成的会话密钥都是独一无二的，防止攻击者截获旧的握手数据包进行重放。

**增加随机性：** 混合三个参数可以增加密钥的熵（随机性），提高破解难度。

## 三、RSA vs ECDHE

**RSA 的缺点：** 如果服务器的私钥泄露，攻击者可以解密之前捕获的所有历史流量（不具备前向安全性）。

**ECDHE 的区别：** 客户端不再直接发送预主密钥，而是双方交换 Diffie-Hellman 参数，各自在本地计算出 `Pre_Master_Secret`。即使私钥后续泄露，也无法反推之前的会话密钥。

现代 HTTPS（TLS 1.2 后期及 TLS 1.3）更推荐使用 ECDHE 密钥交换算法。
