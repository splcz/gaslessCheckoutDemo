# Gasless USDC Transfer Demo

一个演示 ERC-3009 和 ERC-2612 (Permit) 标准的 Gasless USDC 转账 Demo。用户无需持有 ETH 即可完成 USDC 转账，Gas 费用由中继服务代付。

## 功能特性

### ERC-3009 (TransferWithAuthorization)
- 用户签署链下授权（0 Gas）
- 授权指定金额的一次性转账
- 每个签名只能使用一次
- 支持取消授权（需链上交易）

### ERC-2612 (Permit)
- 用户签署链下额度授权（0 Gas）
- 设置 allowance 后可多次转账
- 额度内转账无需用户再次操作
- 支持撤销授权

## 技术栈

- **React 19** - 前端框架
- **Vite** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **Wagmi v3** - Web3 React Hooks
- **Viem** - 以太坊交互库
- **WalletConnect** - 钱包连接

## 项目结构

```
src/
├── components/
│   ├── ConnectWallet.jsx    # 钱包连接组件
│   ├── ERC3009Demo.jsx      # ERC-3009 演示组件
│   ├── PermitDemo.jsx       # ERC-2612 演示组件
│   ├── AuthorizationList.jsx # ERC-3009 授权列表
│   └── PermitList.jsx       # Permit 列表
├── hooks/
│   ├── useERC3009.js        # ERC-3009 相关 Hook
│   └── usePermit.js         # Permit 相关 Hook
├── config/
│   ├── wagmi.js             # Wagmi 配置
│   └── usdc.js              # USDC 合约配置
├── utils/
│   ├── authStorage.js       # ERC-3009 授权本地存储
│   └── permitStorage.js     # Permit 本地存储
└── App.jsx                  # 主应用组件
```

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 环境配置

项目默认连接到以下服务：

- **中继服务**: `https://gas-provider-relayer.vercel.app`
- **中继钱包地址**: `0x4aD8C3db80ef9f384F8680d49d89E66aD8b22e49`
- **目标转账地址**: `0xd1122c8c941fe716c8b0c57b832c90acb4401a05`

如需修改，请编辑 `src/config/usdc.js`。

## 部署到 Vercel

1. Fork 或 Clone 此仓库
2. 在 Vercel 中导入项目
3. Vercel 会自动检测 Vite 项目并配置构建
4. 点击 Deploy 即可

无需额外配置，Vercel 会自动：
- 运行 `npm install`
- 运行 `npm run build`
- 部署 `dist` 目录

## 相关链接

- [ERC-3009: Transfer With Authorization](https://eips.ethereum.org/EIPS/eip-3009)
- [ERC-2612: Permit Extension for ERC-20](https://eips.ethereum.org/EIPS/eip-2612)
- [USDC 合约 (Etherscan)](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)

## 注意事项

- 本 Demo 仅用于演示目的
- 请确保在测试前了解相关风险
- 签名授权前请仔细确认金额和地址
- 授权的签名保存在浏览器 localStorage 中

## License

MIT
