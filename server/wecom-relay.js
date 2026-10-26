require("dotenv").config({ path: "/var/www/huadao-contact-api/.env" });

const crypto = require("crypto");
const express = require("express");

const app = express();
const port = Number(process.env.WECOM_RELAY_PORT || 3001);
const requestTimeoutMs = 8000;
const maxAttempts = 2;

app.disable("x-powered-by");
app.use(express.json({ limit: "20kb" }));

const clean = (value, max = 1000) => String(value ?? "").trim().slice(0, max);
const display = (value, max = 300) => clean(value, max) || "未填写";

const safeEqual = (left, right) => {
    const a = Buffer.from(String(left || ""));
    const b = Buffer.from(String(right || ""));
    return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
};

const parseJson = (value) => {
    try {
        return JSON.parse(value);
    } catch {
        return {};
    }
};

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeout);
    }
};

const formatChinaTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return display(value, 40);
    const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 19).replace("T", " ");
};

const maskContact = (value) => {
    const contact = display(value, 120);
    if (contact.includes("@")) {
        const [local, domain] = contact.split("@");
        return `${local.slice(0, 2)}***@${domain}`;
    }
    if (/^\+?[\d\s-]+$/.test(contact)) {
        const digits = contact.replace(/\D/g, "");
        if (digits.length >= 7) return `${digits.slice(0, 3)}****${digits.slice(-2)}`;
    }
    if (contact.length > 4) return `${contact.slice(0, 2)}***${contact.slice(-2)}`;
    return "已填写";
};

const buildMessage = (lead) => [
    "【华道出海｜官网新客户咨询】",
    "",
    `客户称呼：${display(lead.contact_name, 80)}`,
    `公司名称：${display(lead.company, 120)}`,
    `意向国家：${display(lead.market, 40)}`,
    `业务摘要：${display(lead.business_status, 600)}`,
    `客户来源：${display(lead.source_channel, 20)}`,
    `提交时间：${formatChinaTime(lead.submitted_at)}`,
    `线索编号：${display(lead.id, 80)}`,
    `联系方式（已保护）：${maskContact(lead.contact_method)}`
].join("\n");

const isRetryable = (status, code) => (
    status === null || status === 408 || status === 429 || status >= 500 ||
    [40001, 40014, 42001, 45009].includes(Number(code))
);

async function sendWecom(lead) {
    const corpId = clean(process.env.WECOM_CORP_ID, 200);
    const agentId = clean(process.env.WECOM_AGENT_ID, 40);
    const appSecret = clean(process.env.WECOM_APP_SECRET, 500);
    const toUser = clean(process.env.WECOM_TO_USER, 500);
    const missing = [
        ["WECOM_CORP_ID", corpId],
        ["WECOM_AGENT_ID", agentId],
        ["WECOM_APP_SECRET", appSecret],
        ["WECOM_TO_USER", toUser]
    ].filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) return { ok: false, status: 503, code: null, msg: `missing config: ${missing.join(", ")}` };

    let last = { ok: false, status: null, code: null, msg: "WeCom request failed" };
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const tokenUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/gettoken");
            tokenUrl.searchParams.set("corpid", corpId);
            tokenUrl.searchParams.set("corpsecret", appSecret);
            const tokenResponse = await fetchWithTimeout(tokenUrl.toString());
            const tokenBody = parseJson(await tokenResponse.text());
            if (!tokenResponse.ok || tokenBody.errcode !== 0 || !tokenBody.access_token) {
                last = { ok: false, status: tokenResponse.status, code: tokenBody.errcode ?? null, msg: clean(tokenBody.errmsg || "access token failed", 500), attempts: attempt };
                if (attempt === maxAttempts || !isRetryable(tokenResponse.status, tokenBody.errcode)) return last;
                continue;
            }

            const sendUrl = new URL("https://qyapi.weixin.qq.com/cgi-bin/message/send");
            sendUrl.searchParams.set("access_token", tokenBody.access_token);
            const sendResponse = await fetchWithTimeout(sendUrl.toString(), {
                method: "POST",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({
                    touser: toUser,
                    msgtype: "text",
                    agentid: Number(agentId),
                    text: { content: buildMessage(lead) },
                    safe: 0
                })
            });
            const body = parseJson(await sendResponse.text());
            const result = {
                ok: sendResponse.ok && body.errcode === 0,
                status: sendResponse.status,
                code: body.errcode ?? null,
                msg: clean(body.errmsg || (body.errcode === 0 ? "success" : "send failed"), 500),
                attempts: attempt
            };
            if (result.ok || attempt === maxAttempts || !isRetryable(result.status, result.code)) return result;
            last = result;
        } catch (error) {
            last = { ok: false, status: null, code: null, msg: error.message || "request failed", attempts: attempt };
            if (attempt === maxAttempts) return last;
        }
    }
    return last;
}

app.get("/health", (req, res) => res.json({ ok: true }));

app.post("/api/wecom/notify", async (req, res) => {
    const expected = clean(process.env.WECOM_RELAY_TOKEN, 500);
    const authorization = String(req.get("authorization") || "");
    const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    if (!expected || !safeEqual(supplied, expected)) {
        return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const lead = req.body?.lead;
    if (!lead || typeof lead !== "object") {
        return res.status(400).json({ ok: false, error: "Invalid lead payload" });
    }

    const result = await sendWecom(lead);
    if (!result.ok) {
        console.error(JSON.stringify({ event: "WECOM_RELAY_FAILED", lead_id: display(lead.id, 80), status: result.status, code: result.code }));
    } else {
        console.log(JSON.stringify({ event: "WECOM_RELAY_SUCCESS", lead_id: display(lead.id, 80), status: result.status, code: result.code }));
    }
    return res.status(result.ok ? 200 : 502).json({
        ok: result.ok,
        status: result.status,
        code: result.code,
        msg: result.msg,
        attempts: result.attempts || null
    });
});

app.listen(port, "127.0.0.1", () => {
    console.log(`Huadao WeCom relay listening on 127.0.0.1:${port}`);
});
