# 液冷机柜安装工序数字孪生

正式入口：液冷机柜安装工序数字孪生-连续施工演示版.html。三维库及控制器已内嵌，可直接打开，无需安装依赖。另一个同名短版 HTML 为相同内容的兼容入口。

使用：顶部切换升降机或人工斜坡方案；底部拖动进度或选择关键动作，可暂停回看。斜坡人员、尺寸、受力标注分别开关；中部绑带按用户确认保留，仅展示人员站位。默认演示速度为 2 倍。

斜坡演示抵达坡顶后短暂停留，返回坡底循环搬运，不接续安装。输入重量小于 1000 kg 时左右各 1 名牵引人员；1000–1500 kg（含边界）时左右各 2 名；超过 1500 kg 时左右各 3 名。侧扶及后推各保留 2 人。输入无效时保留最近有效人数，重量显示待确认。

待确认：真实脚轮直接承载还是存在调平工装。柜体竖直及可变支架仍是原有示意表达，尚未完成支撑结构修正。

维护源文件位于 src，manifest.json 定义合并顺序；page.html 为页面和样式，data.js 为工序数据，ramp.js 为斜坡模型和动画，playback.js 为进度控制。修改 src 后运行：
node --experimental-vm-modules package-offline.mjs

dist/index.html 用于开发预览，不作为维护源文件。vendor 保留 Three.js r170 与对应控制器、环境模块及许可证。

验证：
- node --experimental-vm-modules verify.mjs
- node verify-installation.mjs
- node verify-pipeline.mjs
- node verify-ramp.mjs
- node verify-review.mjs
- node --experimental-vm-modules verify-offline.mjs

本轮已验证工序状态、反向拖动、模式恢复、人体网格与柜体间距、落脚停留和暂停后停止渲染。离线模块依赖已验证完全内嵌。

预览：运行 node preview.mjs，访问 http://127.0.0.1:4173/。需要 Node.js 24 或兼容版本。
