# 微信小程序版 Snake MVP 使用说明

目录：`snake/miniprogram/`

## 1. 功能范围（MVP）
- 20×20 网格地图
- 蛇初始长度 3、初始向右
- 4 方向按钮控制（↑ ↓ ← →），禁止 180° 反向
- 食物随机生成，吃到 +10 分并变长
- 撞墙/撞自己结束
- 开始/暂停/继续/重开
- Best 最高分本地存储（`wx.setStorageSync`）

## 2. 如何运行
1. 打开「微信开发者工具」
2. 导入项目：选择目录 `D:\cc\Project\snake\miniprogram`
3. AppID：
   - 若你有 AppID，用自己的
   - 否则选择「测试号」也可运行
4. 进入 `pages/game/game` 页面即可开始

## 3. 操作
- 点击方向按钮控制蛇头方向
- 点击「开始 / 重开」启动或重新开始
- 点击「暂停 / 继续」暂停或继续

## 4. 代码结构
- `app.json`：入口页面配置、导航栏标题
- `pages/game/game.*`：游戏主页面
  - `game.wxml`：UI + canvas + 方向按钮
  - `game.wxss`：样式
  - `game.js`：游戏逻辑（tick、碰撞、吃食物、渲染）

## 5. 注意
- 该版本使用 Canvas 2D（`type="2d"`）渲染。
- tick 使用 `setInterval`，MVP 阶段可接受；后续可优化为更平滑的帧驱动。
