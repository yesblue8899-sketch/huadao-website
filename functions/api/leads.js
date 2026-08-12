import { sendLeadNotifications } from "../_shared/lead-notifications.js";

const MARKET_VALUES = new Set(["墨西哥", "巴西", "墨西哥+巴西", "其他市场"]);
const STAGE_VALUES = new Set(["准备进入拉美", "已经有跨境店铺", "想升级本土店", "企业品牌出海"]);
const SOURCE_VALUES = new Set(["官网", "抖音", "小红书", "公众号"]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    }
});

const clean = (value, max = 500) => String(value || "").trim().slice(0, max);

export async function onRequestPost(context) {
    const { request, env } = context;

    let payload;
    try {
        payload = await request.json();
    } catch (error) {
        return json({ success: false, error: "提交内容格式不正确。" }, 400);
    }

    if (clean(payload.website, 80)) {
        return json({ success: true });
    }

    const lead = {
        submitted_at: new Date().toISOString(),
        company: clean(payload.company, 120),
        contact_name: clean(payload.name, 80),
        contact_method: clean(payload.contact, 120),
        business_status: clean(payload.business, 1200),
        market: clean(payload.market, 40),
        stage: clean(payload.stage, 40),
        source_channel: clean(payload.source || "官网", 20),
        page_url: clean(payload.pageUrl, 500),
        referrer: clean(payload.referrer, 500),
        user_agent: clean(request.headers.get("user-agent"), 500),
        ip: clean(request.headers.get("CF-Connecting-IP"), 80)
    };

    if (!lead.company || !lead.contact_name || !lead.contact_method || !lead.business_status) {
        return json({ success: false, error: "请完整填写公司名称、联系人、联系方式和当前业务情况。" }, 400);
    }
    if (!MARKET_VALUES.has(lead.market)) {
        return json({ success: false, error: "请选择想了解的市场。" }, 400);
    }
    if (!STAGE_VALUES.has(lead.stage)) {
        return json({ success: false, error: "请选择当前阶段。" }, 400);
    }
    if (!SOURCE_VALUES.has(lead.source_channel)) {
        return json({ success: false, error: "请选择来源渠道。" }, 400);
    }
    if (!env.LEADS_DB) {
        return json({ success: false, error: "线索数据库尚未配置，请联系网站管理员绑定 Cloudflare D1。"}, 503);
    }

    try {
        const result = await env.LEADS_DB.prepare(`
            INSERT INTO leads (
                submitted_at,
                company,
                contact_name,
                contact_method,
                market,
                stage,
                business_status,
                source_channel,
                page_url,
                referrer,
                user_agent,
                ip,
                status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            lead.submitted_at,
            lead.company,
            lead.contact_name,
            lead.contact_method,
            lead.market,
            lead.stage,
            lead.business_status,
            lead.source_channel,
            lead.page_url,
            lead.referrer,
            lead.user_agent,
            lead.ip,
            "new"
        ).run();

        const savedLead = {
            ...lead,
            id: result.meta?.last_row_id || result.lastRowId || result.last_row_id || ""
        };
        console.log(JSON.stringify({
            event: "LEAD_SAVED",
            lead_id: savedLead.id,
            market: savedLead.market,
            source_channel: savedLead.source_channel
        }));

        const notificationTask = sendLeadNotifications(savedLead, env);
        if (context.waitUntil) {
            context.waitUntil(notificationTask);
        } else {
            notificationTask.catch((error) => {
                console.log(JSON.stringify({
                    event: "LEAD_NOTIFICATION_FAILED",
                    lead_id: savedLead.id,
                    reason: error?.message || "notification task failed"
                }));
            });
        }

        return json({ success: true });
    } catch (error) {
        return json({ success: false, error: "提交失败，请稍后重试。" }, 500);
    }
}

export async function onRequestOptions() {
    return new Response(null, { status: 204 });
}

export async function onRequestGet() {
    return json({ success: false, error: "Method Not Allowed" }, 405);
}
