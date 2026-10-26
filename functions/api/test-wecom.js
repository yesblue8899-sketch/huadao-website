import { sendWecomLeadNotification } from "../_shared/lead-notifications.js";

const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    }
});

const clean = (value, max = 1000) => String(value ?? "").trim().slice(0, max);

const maskIdentifier = (value) => {
    const identifier = clean(value, 500);
    if (!identifier) return "";
    if (identifier.length <= 8) return `${identifier.slice(0, 2)}...${identifier.slice(-2)}`;
    return `${identifier.slice(0, 4)}...${identifier.slice(-4)}`;
};

const detectRuntimeEnvironment = (request, env) => {
    const host = new URL(request.url).hostname;
    if (host === "www.huadaoguoji.com" || host === "huadaoguoji.com") return "production";
    if (host.includes("pages.dev")) return env.CF_PAGES_BRANCH === "main" ? "production" : "preview";
    return "development";
};

const isAuthorized = (request, env) => {
    const testToken = clean(env.WECOM_TEST_TOKEN, 500);
    if (!testToken) return false;
    const authorization = request.headers.get("authorization") || "";
    const headerToken = request.headers.get("x-admin-token") || "";
    return authorization === `Bearer ${testToken}` || headerToken === testToken;
};

export async function onRequestGet({ request, env }) {
    const testTokenConfigured = Boolean(clean(env.WECOM_TEST_TOKEN, 500));
    if (!testTokenConfigured) {
        return json({
            success: false,
            error: "WeCom test endpoint authentication is not configured."
        }, 503);
    }
    if (!isAuthorized(request, env)) {
        return json({ success: false, error: "Unauthorized" }, 401);
    }

    const runtimeEnvironment = detectRuntimeEnvironment(request, env);
    const base = {
        success: false,
        runtimeEnvironment,
        cfPagesBranch: clean(env.CF_PAGES_BRANCH, 120) || null,
        cfPagesUrl: clean(env.CF_PAGES_URL, 300) || null,
        corpIdConfigured: Boolean(clean(env.WECOM_CORP_ID, 200)),
        corpIdMasked: maskIdentifier(env.WECOM_CORP_ID),
        agentIdConfigured: Boolean(clean(env.WECOM_AGENT_ID, 40)),
        recipientConfigured: Boolean(clean(env.WECOM_TO_USER, 500)),
        responseStatus: null,
        responseBody: null
    };

    try {
        const result = await sendWecomLeadNotification({
            id: "test-wecom",
            submitted_at: new Date().toISOString(),
            company: "华道出海企业微信链路测试",
            contact_name: "Codex Test",
            contact_method: "测试数据，不含客户联系方式",
            market: "阿根廷",
            stage: "测试",
            business_status: "仅验证企业微信官方应用消息发送链路。",
            source_channel: "官网"
        }, env);
        const responseBody = {
            code: result.code ?? null,
            msg: result.msg || result.reason || null,
            attempts: result.attempts || null
        };
        return json({
            ...base,
            success: Boolean(result.ok),
            responseStatus: result.status ?? null,
            responseBody,
            error: result.ok ? null : result.reason || "WeCom notification failed"
        }, result.ok ? 200 : 502);
    } catch (error) {
        return json({
            ...base,
            error: error?.message || "WeCom test request failed"
        }, 502);
    }
}

export async function onRequestPost(context) {
    return onRequestGet(context);
}
