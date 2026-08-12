const clean = (value, max = 1000) => String(value || "").trim().slice(0, max);

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

const buildLeadText = (lead) => [
    "【官网新客户咨询】",
    "",
    `提交时间：${formatChinaTime(lead.submitted_at)}`,
    `公司名称：${clean(lead.company, 120)}`,
    `联系人：${clean(lead.contact_name, 80)}`,
    `联系方式：${clean(lead.contact_method, 120)}`,
    `目标市场：${clean(lead.market, 40)}`,
    `当前阶段：${clean(lead.stage, 40)}`,
    `当前业务情况：${clean(lead.business_status, 1200)}`,
    `来源渠道：${clean(lead.source_channel, 20)}`,
    `线索ID：${leadId(lead)}`
].join("\n");

const buildLeadHtml = (lead) => `
<!doctype html>
<html lang="zh-CN">
<body style="font-family:Arial,'Microsoft YaHei',sans-serif;color:#12233d;line-height:1.7;">
  <h2 style="margin:0 0 16px;color:#0b1f3a;">官网新客户咨询</h2>
  <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:720px;">
    <tr><td style="font-weight:700;background:#f4f7fb;width:140px;">提交时间</td><td>${escapeHtml(formatChinaTime(lead.submitted_at))}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">公司名称</td><td>${escapeHtml(lead.company)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">联系人</td><td>${escapeHtml(lead.contact_name)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">联系方式</td><td>${escapeHtml(lead.contact_method)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">目标市场</td><td>${escapeHtml(lead.market)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">当前阶段</td><td>${escapeHtml(lead.stage)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">业务情况</td><td>${escapeHtml(lead.business_status)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">来源渠道</td><td>${escapeHtml(lead.source_channel)}</td></tr>
    <tr><td style="font-weight:700;background:#f4f7fb;">线索ID</td><td>${escapeHtml(leadId(lead))}</td></tr>
  </table>
</body>
</html>
`.trim();

export const sendFeishuLeadNotification = async (lead, env) => {
    if (!env.FEISHU_LEADS_WEBHOOK) {
        return { ok: false, skipped: true, reason: "FEISHU_LEADS_WEBHOOK not configured" };
    }

    const response = await fetch(env.FEISHU_LEADS_WEBHOOK, {
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

    const feishuCode = data.code ?? data.StatusCode ?? 0;
    if (!response.ok || feishuCode !== 0) {
        return {
            ok: false,
            status: response.status,
            reason: clean(data.msg || data.StatusMessage || text || "Feishu webhook request failed", 500)
        };
    }

    return { ok: true, status: response.status };
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
                message_id: result.id
            });
        } else {
            logEvent(failedEvent, {
                lead_id: leadId(lead),
                status: result.status,
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
