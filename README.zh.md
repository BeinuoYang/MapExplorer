# MapExplorer 🗺️

一款受游戏《饥荒》启发的现实世界地图探索 App。地图初始完全黑暗——只有你真实走过的地方才会被揭开。

## 工作原理

- 地图被一层完全不透明的黑色 Canvas 遮盖
- 手机 GPS 追踪你的位置，利用 `Canvas.destination-out` 模式在遮盖层上"擦出"圆形区域，露出下方的真实地图
- 已探索区域保存在本地，下次启动自动恢复

## 功能特性

- **饥荒风格战争迷雾** — 地图完全隐藏，不是半透明
- **真实 GPS 追踪** — 无需 Google Play Services，使用 WebView 内的 `navigator.geolocation`
- **高德地图瓦片** — 中国大陆可用，无需 API Key
- **WGS-84 → GCJ-02 坐标转换** — GPS 坐标与高德地图精确对齐
- **缩放自适应视野半径** — 真实距离 80 米，任意缩放级别下像素大小自动换算
- **探索记录持久化** — 重启 App 后已探索区域自动恢复

## 技术栈

| 层级 | 选型 | 原因 |
|---|---|---|
| 框架 | Expo（managed） | 无需配置原生环境 |
| 地图 | Leaflet.js（WebView 内） | Canvas 合成模式控制灵活 |
| 定位 | `navigator.geolocation` | 不依赖 Google Play Services |
| 存储 | AsyncStorage | 本地持久化 |

## 快速开始

**环境要求：** Node.js 18+，手机安装 [Expo Go](https://expo.dev/go)

```bash
git clone https://github.com/BeinuoYang/MapExplorer.git
cd MapExplorer
npm install
npx expo start --tunnel
```

扫描二维码用 Expo Go 打开，允许位置权限即可。

## 项目结构

```
MapExplorer/
├── App.js                  # 入口，权限申请
├── assets/
│   └── mapHtml.js          # 核心：Leaflet 地图 + 战争迷雾 Canvas
├── screens/
│   └── MapScreen.js        # WebView 容器 + GPS 消息桥接
├── hooks/
│   └── useLocation.js      # GPS 追踪（备用）
└── utils/
    └── storage.js          # AsyncStorage 读写
```

## 后续计划

- [ ] 探索面积统计（已揭开多少 km²）
- [ ] 导出探索地图为图片
- [ ] 树莓派便携设备版本
- [ ] 探索成就系统
- [ ] 多设备数据同步

## 开源协议

MIT
