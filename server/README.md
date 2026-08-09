# 华道出海咨询表单 API

后端用于接收官网咨询表单，并保存到 MySQL 数据库 `customers`。

## 接口

`POST /api/contact`

请求 JSON：

```json
{
  "company": "公司名称，可选",
  "name": "联系人",
  "contact": "微信 / 电话 / 邮箱，任选一种",
  "market": "目标市场",
  "message": "咨询需求"
}
```

## 数据库

数据库：`customers`

表：`contacts`

字段：

- `id`
- `company`
- `name`
- `contact`
- `market`
- `message`
- `created_time`

## 环境变量

复制 `.env.example` 为 `.env`，填写 MySQL 密码和个人邮箱 SMTP 信息。
