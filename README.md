# 花颜即时通讯应用

一个基于 uni-app + Workerman 架构的跨平台即时通讯应用，支持 Android/iOS/小程序多端部署。

## 🚀 项目特色

- **跨平台支持**: 一套代码，多端运行（App、小程序、H5）
- **实时通信**: 基于 WebSocket 的高性能实时消息传输
- **高并发架构**: 采用 Workerman 分布式长连接框架
- **多媒体支持**: 支持文本、图片、文件等多种消息类型
- **离线消息**: 完善的消息队列和重连机制

## 🛠️ 技术栈

### 前端
- **框架**: uni-app + Vue.js 2
- **语言**: JavaScript
- **通信**: WebSocket
- **UI组件**: 自定义组件 + v-emoji-picker

### 后端
- **语言**: PHP
- **框架**: Workerman + GatewayWorker
- **数据库**: MySQL
- **架构**: 分布式长连接

## 📱 功能特性

- ✅ 用户注册登录
- ✅ 实时聊天
- ✅ 多媒体消息（文本、图片、文件）
- ✅ 联系人管理
- ✅ 消息历史记录
- ✅ 离线消息处理
- ✅ 表情支持
- ✅ 文件上传下载

## 🏗️ 项目结构

```
zjyapp/
├── pages/                  # 页面文件
│   ├── login/             # 登录页面
│   ├── chat/              # 聊天页面
│   ├── contacts/          # 联系人页面
│   └── profile/           # 个人资料页面
├── components/            # 组件库
├── utils/                 # 工具类
│   ├── websocket.js       # WebSocket工具类
│   └── util.js           # 通用工具
├── static/               # 静态资源
├── workerman-chat/       # 后端服务
│   ├── Applications/     # 应用目录
│   ├── start.php        # 启动文件
│   └── uploads/         # 文件上传目录
├── manifest.json         # uni-app配置
├── pages.json           # 页面配置
└── package.json         # 依赖配置
```

## 🚀 快速开始

### 前端部署

1. 安装依赖
```bash
npm install
```

2. 使用 HBuilderX 打开项目

3. 运行到相应平台
   - App: 连接手机或模拟器运行
   - 小程序: 配置小程序开发者工具
   - H5: 运行到浏览器

### 后端部署

1. 进入后端目录
```bash
cd workerman-chat
```

2. 安装 PHP 依赖
```bash
composer install
```

3. 配置数据库
   - 修改 `Applications/Chat/config.php` 中的数据库配置
   - 导入数据库结构（需要提供 SQL 文件）

4. 启动服务
```bash
# Linux/Mac
php start.php start

# Windows
start_for_win.bat
```

## ⚙️ 配置说明

### 前端配置
- `manifest.json`: uni-app 应用配置
- `pages.json`: 页面路由配置
- `utils/websocket.js`: WebSocket 服务器地址配置

### 后端配置
- `Applications/Chat/config.php`: 数据库和服务配置
- `start_*.php`: 各服务进程启动配置

## 🔧 开发说明

### WebSocket 通信协议
```javascript
// 消息格式
{
    "biztype": "消息类型",
    "DATA": "消息数据"
}
```

### 主要消息类型
- `userLogin`: 用户登录
- `userReg`: 用户注册
- `sendMessage`: 发送消息
- `getHistory`: 获取历史消息
- `addFriend`: 添加好友

## 📊 性能特点

- 支持数万并发连接
- 消息传输延迟 < 100ms
- 支持水平扩展
- 完善的错误处理和重连机制

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 联系方式

如有问题或建议，请通过以下方式联系：

- 邮箱: [your-email@example.com]
- GitHub Issues: [项目Issues页面]

## 🙏 致谢

感谢以下开源项目：
- [uni-app](https://uniapp.dcloud.io/)
- [Workerman](https://www.workerman.net/)
- [Vue.js](https://vuejs.org/)
