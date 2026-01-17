# Prediction market contract

## background

我目标是实现一个舆情预测市场合约，会有大量的娱乐八卦事件，并且最终会部署到Monad testnet

Monad是一个TPS 1w+的高性能公链，我希望编写的合约能压榨其性能的极致

且这是一场monad举办的黑客松，我们的合约只要有极佳的演示效果即可

## content

1. 提供发布的事件的接口，为agent调用做铺垫
2. 提供resolve事件的接口，为agent调用做铺垫
3. 事件发布上链，用户无需后端，只要访问合约（监听emit事件信息）就能订阅预测市场信息流
4. 合约只提供Yes/No两个选项即可
5. 提供弹幕和评论上链，emit（事件id，弹幕 or 评论，内容）

## extend

为了更好的演示效果，可以选择一些地方自由发挥，从而更好地体现monad的特点

## warn

合约可读性要强
