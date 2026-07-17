# LUPA Atlas｜月壤颗粒形貌数据库

面向科研演示与成果展示的月壤颗粒形貌数据库原型，包含颗粒数据浏览、三维模型检视、自动分类结果与统计分析工作台。

## 功能

- 按类别、编号和形貌参数浏览颗粒标本
- 交互式三维颗粒视窗：旋转、缩放、表面/点云/CT 模式切换
- 分类置信度、混淆矩阵和特征贡献展示
- 形貌参数关联、类别构成和参数范围分析
- 桌面端与移动端响应式布局

## 本地运行

```bash
npm install
npm run dev
```

## GitHub Pages

推送到 `main` 分支后，GitHub Actions 会自动生成静态站点并部署至：

<https://wanglingxin-hit.github.io/lunar-regolith-atlas/>

## 数据说明

当前版本为科研展示原型，部分单颗粒编号与参数为演示数据。后续可接入真实 CSV 数据以及 STL/OBJ 三维模型。
