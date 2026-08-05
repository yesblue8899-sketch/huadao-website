CREATE DATABASE IF NOT EXISTS customers
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'huadao'@'localhost' IDENTIFIED BY '请替换为强密码';
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
