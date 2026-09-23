const json = (body, status = 200) => new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    }
});

const clean = (value, max = 1000) => String(value ?? "").trim().slice(0, max);

const maskWebhook = (value) => {
    const webhook = clean(value, 500);
    if (!webhook) return "";
    if (webhook.length <= 18) return `${webhook.slice(0, 4)}...${webhook.slice(-4)}`;
    return `${webhook.slice(0, 28)}...${webhook.slice(-10)}`;
};

const detectRuntimeEnvironment = (request, env) => {
    const host = new URL(request.url).hostname;
    if (host === "www.huadaoguoji.com" || host === "huadaoguoji.com") return "production";
    if (host.includes("pages.dev")) {
        return env.CF_PAGES_BRANCH === "main" ? "production" : "preview";
    }
    return "development";
};

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

const parseFeishuBody = (text) => {
    try {
        return JSON.parse(text);
    } catch (error) {
        return text;
    }
};

export async function onRequestGet({ request, env }) {
    const webhook = clean(env.FEISHU_LEADS_WEBHOOK, 500);
    const runtimeEnvironment = detectRuntimeEnvironment(request, env);
    const base = {
        success: false,
        runtimeEnvironment,
        cfPagesBranch: clean(env.CF_PAGES_BRANCH, 120) || null,
        cfPagesUrl: clean(env.CF_PAGES_URL, 300) || null,
        webhookConfigured: Boolean(webhook),
        webhookUrlMasked: maskWebhook(webhook),
        responseStatus: null,
        responseBody: null
    };

    if (!webhook) {
        console.log(JSON.stringify({
            event: "FEISHU_TEST_FAILED",
            runtime_environment: runtimeEnvironment,
            reason: "FEISHU_LEADS_WEBHOOK not configured"
        }));
        return json({
            ...base,
            error: "FEISHU_LEADS_WEBHOOK not configured in this runtime environment."
        }, 500);
    }

    try {
        const response = await fetchWithTimeout(webhook, {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                msg_type: "text",
                content: {
                    text: "【华道出海官网｜飞书通知链路测试】\n\n这是一条Codex生产联调测试消息。\n如果收到，说明Webhook有效。"
                }
            })
        });
        const text = await response.text();
        const responseBody = parseFeishuBody(text);
        const feishuCode = typeof responseBody === "object" && responseBody
            ? responseBody.code ?? responseBody.StatusCode ?? responseBody.errcode ?? 0
            : 0;
        const success = response.ok && feishuCode === 0;

        console.log(JSON.stringify({
            event: success ? "FEISHU_TEST_SUCCESS" : "FEISHU_TEST_FAILED",
            runtime_environment: runtimeEnvironment,
            status: response.status,
            code: feishuCode,
            msg: typeof responseBody === "object" && responseBody
                ? clean(responseBody.msg || responseBody.StatusMessage || responseBody.errmsg || "", 300)
                : clean(text, 300)
        }));

        return json({
            ...base,
            success,
            responseStatus: response.status,
            responseBody
        }, success ? 200 : 502);
    } catch (error) {
        console.log(JSON.stringify({
            event: "FEISHU_TEST_FAILED",
            runtime_environment: runtimeEnvironment,
            reason: error?.message || "Feishu test request failed"
        }));
        return json({
            ...base,
            error: error?.message || "Feishu test request failed"
        }, 502);
    }
}

export async function onRequestPost(context) {
    return onRequestGet(context);
}
