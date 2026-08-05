# 阿里云 ECS 部署步骤

服务器：`47.112.0.50`

API 域名：`api.huadaoguoji.com`

## 1. DNS 解析

在当前管理 `huadaoguoji.com` DNS 的平台添加：

- 主机记录：`api`
- 记录类型：`A`
- 记录值：`47.112.0.50`
- TTL：默认

同时在阿里云 ECS 安全组放行：

- `80`
- `443`
- `22`

后端服务监听 `127.0.0.1:3000`，不需要对公网开放 `3000`。

## 2. 安装基础环境

Ubuntu / Debian：

```bash
sudo apt update
sudo apt install -y curl git nginx mysql-server certbot python3-certbot-nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

Alibaba Cloud Linux / CentOS：

```bash
sudo yum update -y
sudo yum install -y git nginx mysql-server certbot python3-certbot-nginx
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs
sudo npm install -g pm2
```

检查版本：

```bash
node -v
npm -v
pm2 -v
```

## 3. 创建数据库

进入 MySQL：

```bash
sudo mysql
```

执行 SQL，把密码改成你自己的强密码：

```sql
CREATE DATABASE IF NOT EXISTS customers
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'huadao'@'localhost' IDENTIFIED BY '替换为数据库强密码';
GRANT ALL PRIVILEGES ON customers.* TO 'huadao'@'localhost';
FLUSH PRIVILEGES;

USE customers;

CREATE TABLE IF NOT EXISTS contacts (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    company VARCHAR(255) NULL,
    name VARCHAR(120) NOT NULL,
    contact VARCHAR(255) NOT NULL,
    market VARCHAR(120) NOT NULL,
    message TEXT NOT NULL,
    created_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_created_time (created_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

EXIT;
```

## 4. 上传并安装后端

如果服务器可以访问 GitHub：

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/yesblue8899-sketch/huadao-website.git huadao-website
sudo cp -r /var/www/huadao-website/server /var/www/huadao-contact-api
sudo chown -R $USER:$USER /var/www/huadao-contact-api
cd /var/www/huadao-contact-api
npm install --omit=dev
cp .env.example .env
nano .env
```

如果服务器不能访问 GitHub，就把本地 `server/` 文件夹上传到：

```bash
/var/www/huadao-contact-api
```

然后执行：

```bash
cd /var/www/huadao-contact-api
npm install --omit=dev
cp .env.example .env
nano .env
```

`.env` 必须填写：

```env
DB_PASSWORD=你的数据库密码
SMTP_HOST=你的邮箱SMTP服务器
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=你的邮箱
SMTP_PASS=你的邮箱SMTP授权码
MAIL_FROM=你的邮箱
ALERT_EMAIL_TO=接收提醒的邮箱
```

## 5. 启动 API

```bash
cd /var/www/huadao-contact-api
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd
```

本机检查：

```bash
curl http://127.0.0.1:3000/health
```

看到 `{"ok":true}` 表示服务正常。

## 6. 配置 Nginx

新建配置：

```bash
sudo nano /etc/nginx/conf.d/api.huadaoguoji.com.conf
```

写入：

```nginx
server {
    listen 80;
    server_name api.huadaoguoji.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

检查并重载：

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

## 7. 配置 HTTPS

确保 `api.huadaoguoji.com` 已解析到 `47.112.0.50` 后执行：

```bash
sudo certbot --nginx -d api.huadaoguoji.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

公网检查：

```bash
curl https://api.huadaoguoji.com/health
```

## 8. 查看客户数据

```bash
mysql -u huadao -p customers
```

进入后执行：

```sql
SELECT id, company, name, contact, market, message, created_time
FROM contacts
ORDER BY created_time DESC
LIMIT 20;
```

## 9. 修改邮件配置

编辑 `.env`：

```bash
cd /var/www/huadao-contact-api
nano .env
pm2 restart huadao-contact-api
```

需要改的字段：

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`
- `ALERT_EMAIL_TO`
