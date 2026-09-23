const clean = (value, max = 1000) => String(value ?? "").trim().slice(0, max);

const safeMeta = (meta = {}) => Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, clean(value, 300)])
);

const escapeHtml = (value) => clean(value, 1200)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");

const logEvent = (event, meta = {}) => {
    console.log(JSON.stringify({
        event,
        ...safeMeta(meta)
    }));
};

const splitRecipients = (value) => clean(value, 500)
    .split(/[,\s;]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const formatChinaTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return clean(value, 40);
    const shifted = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return shifted.toISOString().slice(0, 19).replace("T", " ");
};

const leadId = (lead) => lead.id || "pending";
const display = (value, max = 300) => clean(value, max) || "未填写";
const requestTimeoutMs = 8000;

const fetchWithTimeout = async (url, options = {}) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort("request timeout"), requestTimeoutMs);
    try {
        return await fetch(url, {
            ...options,
            signal: controller.signal
        });
    } finally {
        clearTimeout(timeout);
    }
};

const buildLeadText = (lead) => [
    "【华道出海｜官网新增客户咨询】",
    "",
    `公司名称：${display(lead.company, 120)}`,
    `联系人：${display(lead.contact_name, 80)}`,
    `联系方式：${display(lead.contact_method, 120)}`,
    "",
    `目标市场：${display(lead.market, 40)}`,
    `当前阶段：${display(lead.stage, 40)}`,
    "",
    "当前业务情况：",
    display(lead.business_status, 1200),
    "",
    `来源渠道：${display(lead.source_channel, 20)}`,
    "",
    `提交时间：${formatChinaTime(lead.submitted_at)}`,
    "线索来源：华道出海官网",
    "",
    "请及时跟进该客户。"
].join("\n");

const buildLeadHtml = (lead) => `
<!doctype html>
<html lang="zh-CN">
<body style="font-family:Arial,'Microsoft YaHei',sans-serif;color:#12233d;line-height:1.7;">
  <h2 style="margin:0 0 16px;color:#0b1f3a;">华道出海｜官网新增客户咨询</h2>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">
    <tr><td style="font-weight:700;background:#f4f7fb;width:140px;">公司名称</td><td>${escapeHtml(display(lead.company, 120))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">联系人</td><td>${escapeHtml(display(lead.contact_name, 80))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">联系方式</td><td>${escapeHtml(display(lead.contact_method, 120))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">目标市场</td><td>${escapeHtml(display(lead.market, 40))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">当前阶段</td><td>${escapeHtml(display(lead.stage, 40))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">当前业务情况</td><td>${escapeHtml(display(lead.business_status, 1200))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">来源渠道</td><td>${escapeHtml(display(lead.source_channel, 20))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">提交时间</td><td>${escapeHtml(formatChinaTime(lead.submitted_at))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">线索来源</td><td>华道出海官网</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">线索ID</td><td>${escapeHtml(leadId(lead))}</td></tr>
  </table>
  <p style="margin-top:16px;">请及时跟进该客户。</p>
</body>
</html>
`.trim();

export const sendFeishuLeadNotification = async (lead, env) => {
    if (!env.FEISHU_LEADS_WEBHOOK) {
        return { ok: false, skipped: true, reason: "FEISHU_LEADS_WEBHOOK not configured" };
    }

    const response = await fetchWithTimeout(env.FEISHU_LEADS_WEBHOOK, {
        method: "POST",
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify({
            msg_type: "text",
            content: {
                text: buildLeadText(lead)
            }
        })
    });

    const text = await response.text();
    let data = {};
    try {
        data = JSON.parse(text);
    } catch (error) {
        data = {};
    }

    const feishuCode = data.code ?? data.StatusCode ?? data.errcode ?? 0;
    const feishuMessage = clean(data.msg || data.StatusMessage || data.errmsg || text || "success", 500);
    if (!response.ok || feishuCode !== 0) {
        return {
            ok: false,
            status: response.status,
            code: feishuCode,
            msg: feishuMessage,
            reason: feishuMessage
        };
    }

    return {
        ok: true,
        status: response.status,
        code: feishuCode,
        msg: feishuMessage
    };
};

export const sendEmailLeadNotification = async (lead, env) => {
    const recipients = splitRecipients(env.LEADS_NOTIFY_EMAIL);
    if (!env.RESEND_API_KEY || recipients.length === 0 || !env.LEADS_FROM_EMAIL) {
        return {
            ok: false,
            skipped: true,
            reason: "RESEND_API_KEY, LEADS_NOTIFY_EMAIL or LEADS_FROM_EMAIL not configured"
        };
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: clean(env.LEADS_FROM_EMAIL, 200),
            to: recipients,
            subject: `【华道出海官网新咨询】${clean(lead.company, 80)} - ${clean(lead.contact_name, 60)}`,
            text: buildLeadText(lead),
            html: buildLeadHtml(lead)
        })
    });

    const text = await response.text();
    let data = {};
    try {
        data = JSON.parse(text);
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        return {
            ok: false,
            status: response.status,
            reason: clean(data.message || data.error || text || "Resend request failed", 500)
        };
    }

    return { ok: true, status: response.status, id: data.id };
};

const runNotification = async (lead, successEvent, failedEvent, sender) => {
    try {
        const result = await sender();
        if (result.ok) {
            logEvent(successEvent, {
                lead_id: leadId(lead),
                status: result.status,
                code: result.code,
                msg: result.msg,
                message_id: result.id
            });
        } else {
            logEvent(failedEvent, {
                lead_id: leadId(lead),
                status: result.status,
                code: result.code,
                msg: result.msg,
                skipped: result.skipped ? "true" : "false",
                reason: result.reason
            });
        }
        return result;
    } catch (error) {
        logEvent(failedEvent, {
            lead_id: leadId(lead),
            reason: error?.message || "notification exception"
        });
        return { ok: false, reason: error?.message || "notification exception" };
    }
};

export const sendLeadNotifications = async (lead, env) => Promise.allSettled([
    runNotification(
        lead,
        "FEISHU_NOTIFICATION_SUCCESS",
        "FEISHU_NOTIFICATION_FAILED",
        () => sendFeishuLeadNotification(lead, env)
    ),
    runNotification(
        lead,
        "EMAIL_NOTIFICATION_SUCCESS",
        "EMAIL_NOTIFICATION_FAILED",
        () => sendEmailLeadNotification(lead, env)
    )
]);
