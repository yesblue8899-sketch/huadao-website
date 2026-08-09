require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");

const app = express();
const port = Number(process.env.PORT || 3000);

const allowedOrigins = (process.env.CORS_ORIGINS ||
    "https://www.huadaoguoji.com,https://huadaoguoji.com,https://huadao-website.pages.dev,http://127.0.0.1:8787,http://localhost:8787")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const pool = mysql.createPool({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "huadao",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "customers",
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
    timezone: "+08:00"
});

const mailTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const isMailConfigured = Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    process.env.ALERT_EMAIL_TO
);

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "20kb" }));
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error("Not allowed by CORS"));
    }
}));
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false
}));

function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
}

async function ensureTable() {
    await pool.query(`
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
    `);
}

async function sendNotification(customer) {
    if (!isMailConfigured) {
        console.warn("SMTP is not configured. Contact saved without email notification.");
        return;
    }

    const submittedAt = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        hour12: false
    });

    const text = [
        "华道出海官网收到新的咨询：",
        "",
        `公司名称：${customer.company || "未填写"}`,
        `联系人：${customer.name}`,
        `联系方式：${customer.contact}`,
        `目标市场：${customer.market}`,
        `咨询需求：${customer.message}`,
        `提交时间：${submittedAt}`
    ].join("\n");

    await mailTransporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: process.env.ALERT_EMAIL_TO,
        subject: "华道出海官网新的客户咨询",
        text
    });
}

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.post("/api/contact", async (req, res) => {
    const customer = {
        company: cleanText(req.body.company, 255),
        name: cleanText(req.body.name, 120),
        contact: cleanText(req.body.contact, 255),
        market: cleanText(req.body.market, 120),
        message: cleanText(req.body.message, 3000)
    };

    if (!customer.name || !customer.contact || !customer.market || !customer.message) {
        res.status(400).json({ ok: false, message: "Missing required fields" });
        return;
    }

    try {
        await pool.execute(
            `INSERT INTO contacts (company, name, contact, market, message)
             VALUES (:company, :name, :contact, :market, :message)`,
            customer
        );

        try {
            await sendNotification(customer);
        } catch (mailError) {
            console.error("Email notification failed:", mailError);
        }

        res.json({ ok: true });
    } catch (error) {
        console.error("Contact submit failed:", error);
        res.status(500).json({ ok: false, message: "Server error" });
    }
});

ensureTable()
    .then(() => {
        app.listen(port, "127.0.0.1", () => {
            console.log(`Huadao contact API listening on 127.0.0.1:${port}`);
        });
    })
    .catch((error) => {
        console.error("Failed to initialize database:", error);
        process.exit(1);
    });
