CREATE TABLE IF NOT EXISTS market_insights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL CHECK (country IN ('Mexico', 'Brazil', 'LATAM')),
    category TEXT NOT NULL CHECK (category IN ('platform', 'tax', 'business', 'logistics', 'brand')),
    tags TEXT NOT NULL DEFAULT '[]',
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    publish_date TEXT NOT NULL,
    update_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    impact_level TEXT NOT NULL DEFAULT 'B',
    impact_score INTEGER NOT NULL DEFAULT 0,
    business_score INTEGER NOT NULL DEFAULT 0,
    content_score INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    ai_generated INTEGER NOT NULL DEFAULT 0 CHECK (ai_generated IN (0, 1)),
    review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected')),
    source_url TEXT,
    source_published_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_market_insights_status_date ON market_insights (status, publish_date DESC);
CREATE INDEX IF NOT EXISTS idx_market_insights_country ON market_insights (country);
CREATE INDEX IF NOT EXISTS idx_market_insights_category ON market_insights (category);
CREATE INDEX IF NOT EXISTS idx_market_insights_slug ON market_insights (slug);
CREATE INDEX IF NOT EXISTS idx_market_insights_review_status ON market_insights (review_status);
CREATE INDEX IF NOT EXISTS idx_market_insights_impact_level ON market_insights (impact_level);

CREATE TABLE IF NOT EXISTS insight_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    country TEXT NOT NULL CHECK (country IN ('Mexico', 'Brazil', 'LATAM')),
    category TEXT NOT NULL CHECK (category IN ('platform', 'tax', 'business', 'logistics', 'brand')),
    published_date TEXT,
    matched_keywords TEXT NOT NULL DEFAULT '[]',
    impact_score INTEGER NOT NULL DEFAULT 0,
    business_score INTEGER NOT NULL DEFAULT 0,
    content_score INTEGER NOT NULL DEFAULT 0,
    total_score INTEGER NOT NULL DEFAULT 0,
    impact_level TEXT NOT NULL DEFAULT 'ignored',
    status TEXT NOT NULL DEFAULT 'collected' CHECK (status IN ('collected', 'ignored', 'analyzed')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_insight_sources_status ON insight_sources (status);
CREATE INDEX IF NOT EXISTS idx_insight_sources_country ON insight_sources (country);
CREATE INDEX IF NOT EXISTS idx_insight_sources_impact_level ON insight_sources (impact_level);

INSERT INTO market_insights (
    title,
    slug,
    country,
    category,
    tags,
    summary,
    content,
    source,
    publish_date,
    update_date,
    status
) VALUES
(
    'TikTok Shop进入巴西后，中国卖家需要关注什么？',
    'brazil-tiktok-shop-2026',
    'Brazil',
    'platform',
    '["TikTok Shop","巴西","内容电商","本土主体"]',
    '分析 TikTok Shop 进入巴西后对中国卖家的平台资质、内容运营、履约和合规准备要求。',
    '{"sections":{"background":["TikTok Shop 在拉美市场的推进，使巴西成为中国卖家观察内容电商的重要市场。与传统货架电商相比，内容驱动的平台更依赖本地表达、达人协作、履约时效和售后体验。","对计划进入巴西的企业而言，平台机会并不等同于简单开店。主体、CNPJ、税务资料、收付款和库存安排，会直接影响店铺审核、活动参与和长期经营稳定性。"],"why":["巴西消费者规模大、社媒使用活跃，但商业环境和税务体系也更复杂。平台越重视本地体验，越会要求卖家具备稳定的主体资料、合规经营能力和本地服务能力。","如果企业只按跨境试水逻辑准备，后续可能在结算、发票、退换货、内容协作和税务申报上遇到瓶颈。"],"impact":["已有供应链优势、品牌内容能力或达人合作资源的企业，应重点关注 TikTok Shop 与本土主体、CNPJ、巴西支付和本地仓配之间的衔接。","跨境卖家需要评估现有 SKU 是否适合内容展示，工厂企业需要判断是否从代工供货转向品牌化表达，品牌企业则需要提前准备葡语内容和本地客服。"],"observation":["华道观察认为，TikTok Shop 巴西的机会不是单一流量红利，而是内容电商、本土主体和平台合规共同作用后的经营升级。越早把主体、税务、内容和履约做成体系，越容易承接平台规则变化。"],"actions":["先确认是否需要巴西 CNPJ 和本地收付款安排。","梳理重点 SKU 的合规、进口、售后和履约要求。","建立葡语内容、达人合作和客服响应机制。","把 TikTok Shop 与 Mercado Livre 等平台作为组合渠道，而不是孤立试点。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    '巴西电商发展观察：本土主体、支付与合规成为进入前置条件',
    'brazil-ecommerce-2026',
    'Brazil',
    'business',
    '["巴西电商","CNPJ","支付","合规"]',
    '从主体、CNPJ、支付、履约和税务角度，梳理中国企业评估巴西电商市场时应关注的核心变量。',
    '{"sections":{"background":["巴西电商市场持续吸引中国供应链、品牌和跨境卖家关注。企业进入巴西时，常见问题不只是平台选择，而是本地主体、税务身份、收付款、进口清关和履约体系是否同步准备。","随着平台对消费者体验和卖家治理要求提高，缺少 CNPJ、对公收款和税务衔接的企业，会更难支撑长期经营。"],"why":["巴西的税务、发票和支付环境与中国卖家熟悉的跨境模式差异明显。企业如果只按短期投放和铺货逻辑进入，容易在订单规模扩大后出现合规和运营瓶颈。","本地化能力会影响平台信任、物流时效、售后体验和渠道合作机会。"],"impact":["计划通过 Mercado Livre、TikTok Shop 或独立渠道销售的企业，都需要关注 CNPJ、银行账户、Pix、税务申报、进口责任和本地仓配。","已有出口订单的工厂，也需要判断是否从贸易供货升级为巴西本地经营主体，以便承接更稳定的渠道合作。"],"observation":["华道观察认为，巴西不适合只把平台店铺作为前端动作。主体、税务、支付和履约是同一套经营底座，进入顺序应从合规底座开始，而不是等店铺增长后再补。"],"actions":["评估是否设立巴西 CNPJ 主体，以及主体类型是否匹配经营方式。","提前规划对公账户、Pix 和平台结算路径。","确认进口、仓配、发票和税务申报责任边界。","将巴西作为中长期市场经营，而不是一次性平台测试。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    'Mercado Livre 巴西市场变化观察：平台经营正在考验本地化深度',
    'mercado-libre-brazil-market-shift',
    'Brazil',
    'platform',
    '["Mercado Livre","巴西本土店","平台规则","履约"]',
    '从本土店、物流、消费者信任和平台合规角度，分析美客多巴西经营的长期趋势。',
    '{"sections":{"background":["Mercado Livre 是巴西电商生态中的核心平台之一。随着平台竞争加剧，卖家能力逐步从上架能力转向履约、售后、税务和品牌信任的综合能力。","中国企业进入 Mercado Livre 巴西时，需要同时理解平台经营规则和巴西本地商业基础设施。"],"why":["平台对商品体验、发货时效、评价、售后和合规资料的要求，会让缺少本地化配置的卖家处于被动位置。","本土主体、税务资料和稳定履约不仅影响开店，也影响后续活动参与、收款和消费者信任。"],"impact":["跨境卖家如果希望在巴西长期经营，需要评估本土店、海外仓、发票、客服和退换货能力。","品牌企业则需要关注平台页面内容、葡语客服、评价积累和本地消费者沟通方式。"],"observation":["华道观察认为，Mercado Livre 巴西更适合具备供应链深度和经营耐心的企业。平台机会仍在，但经营门槛已经从流量获取转向本地化深度。"],"actions":["确认 CNPJ、平台资料和税务申报路径。","规划本地仓配或稳定跨境履约方案。","建立葡语售后和退换货处理流程。","将平台经营数据与长期合规维护结合起来管理。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    '墨西哥 Mercado Libre 规则变化观察：本土店经营为什么要提前配置主体与 RFC',
    'mexico-mercado-libre-rules',
    'Mexico',
    'platform',
    '["Mercado Libre","墨西哥","RFC","本土店"]',
    '围绕美客多墨西哥本土店资质、RFC、税务和履约，说明跨境卖家升级本地化经营的关键准备。',
    '{"sections":{"background":["墨西哥 Mercado Libre 的本土店经营，越来越依赖稳定的企业主体、RFC 税号、平台资料和履约能力。对中国卖家来说，规则变化背后的方向是平台治理更加重视真实经营身份。","跨境店铺可以作为进入方式，但如果企业希望扩大经营空间，本土化配置会逐渐成为重要前提。"],"why":["RFC 是墨西哥税务识别、平台审核、发票和对公结算的重要基础。缺少税务身份时，卖家在长期经营、活动参与和平台资料稳定性上会受到限制。","平台规则的变化往往不是单点问题，而是对主体、税务、物流和售后能力的综合筛选。"],"impact":["已有跨境店的卖家，需要判断是否通过墨西哥 SA 与 RFC 升级本土店。","准备进入墨西哥的工厂和品牌，应在开店前同步规划主体、税号、银行、平台资料和长期申报。"],"observation":["华道观察认为，墨西哥本土店不是单纯多一个店铺类型，而是企业从跨境销售转向本地经营的制度入口。提前配置主体与 RFC，能够减少后续资料补齐和经营中断风险。"],"actions":["先做墨西哥 SA 主体和 RFC 可行性评估。","梳理平台入驻、税务申报、对公收款所需资料。","评估现有跨境店铺是否适合迁移或并行本土店。","建立发票、账务和平台资料维护的长期机制。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    'TikTok Shop 墨西哥发展观察：内容电商给中国品牌带来的机会与门槛',
    'tiktok-shop-mexico-growth',
    'Mexico',
    'brand',
    '["TikTok Shop","墨西哥","品牌本地化","内容电商"]',
    '从内容、主体、税务、达人和平台资料角度，分析中国品牌进入墨西哥 TikTok Shop 的准备重点。',
    '{"sections":{"background":["TikTok Shop 在墨西哥的发展，让内容电商成为中国品牌进入拉美的重要观察方向。与传统平台相比，内容电商更强调产品表达、达人协作和即时转化。","墨西哥市场接近北美供应链和消费者文化，但企业仍需要处理主体、税务、客服和本地化内容问题。"],"why":["内容电商降低了品牌触达消费者的距离，也提高了对本地表达和信任建设的要求。平台越成熟，越需要卖家具备完整资料和稳定履约能力。","如果企业没有主体和税务规划，内容带来的订单增长可能无法被后端能力承接。"],"impact":["品牌企业需要关注西语内容、达人合作、平台资料和售后响应。","工厂企业如果想从供应链走向品牌，应提前判断产品是否适合内容化展示，以及是否需要建立墨西哥本地经营主体。"],"observation":["华道观察认为，TikTok Shop 墨西哥不是短视频投放项目，而是品牌本地化经营项目。内容、主体、税务和履约需要同步设计。"],"actions":["确定重点产品是否适合西语内容和达人场景。","评估墨西哥 SA、RFC 和平台资料准备路径。","建立本地客服、售后和评价管理机制。","将 TikTok Shop 与 Mercado Libre 等平台组合规划。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    '拉美平台观察：Mercado Libre、TikTok Shop、Temu、SHEIN 对卖家能力的不同要求',
    'latam-platform-observation-2026',
    'LATAM',
    'platform',
    '["Mercado Libre","TikTok Shop","Temu","SHEIN"]',
    '对比拉美重点平台的经营逻辑，帮助中国企业判断适合自己的平台路径和本土化投入顺序。',
    '{"sections":{"background":["拉美电商平台生态正在分化。Mercado Libre 更重视本地履约和平台信任，TikTok Shop 更强调内容和达人转化，Temu 与 SHEIN 则代表不同类型的平台供给和价格竞争逻辑。","对中国企业而言，平台选择不能只看流量，而要看自身主体、供应链、内容、履约和合规能力是否匹配。"],"why":["不同平台的经营门槛不同，决定了企业需要准备的组织能力也不同。选择错误的平台路径，可能造成大量前期投入无法沉淀为长期能力。","平台规则还会随税务监管、消费者保护和本土卖家生态变化持续调整。"],"impact":["跨境卖家需要判断自身是否具备升级本土店的资源。品牌企业要重视内容、本地表达和售后体验。工厂企业则需要选择供货、品牌化或本地经营中的一种主路径。","多平台经营不是简单复制商品，而是主体、税务、库存、内容和客服体系的复用。"],"observation":["华道观察认为，拉美平台机会正在从单平台红利转向经营体系竞争。能把平台前端与本地主体、税务和履约能力打通的企业，更容易形成长期壁垒。"],"actions":["先明确企业进入拉美的主路径：跨境测试、本土店升级、品牌本地化或供应链合作。","按平台要求梳理主体、税号、支付、履约和内容能力缺口。","避免同时铺开过多平台，优先验证一个国家和一个核心平台。","建立可复用的资料、合规和经营数据管理机制。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    '工厂企业进入拉美的典型路径：从供货订单到本地化经营主体',
    'chinese-factory-latam-entry-case',
    'LATAM',
    'business',
    '["中国工厂","拉美出海","供应链","本土主体"]',
    '以工厂企业常见出海路径为例，拆解从外贸供货到拉美本土经营需要补齐的主体、税务和渠道能力。',
    '{"sections":{"background":["不少中国工厂最初通过外贸订单、平台供货或渠道客户触达拉美市场。当订单逐步稳定后，企业会开始考虑是否设立本地主体、直接对接平台或建立品牌化经营。","这一阶段的核心问题，是企业是否继续做供货商，还是升级为拉美本地经营者。"],"why":["工厂具备产品和成本优势，但在拉美市场直接经营时，还需要补齐主体、税务、平台、品牌、仓配和售后能力。","没有本地化经营底座，企业容易停留在低议价的供货角色，难以沉淀渠道和客户资产。"],"impact":["适合关注这一变化的企业包括已有拉美订单的工厂、有稳定品类优势的制造商，以及希望从代工转向品牌出海的企业。","企业需要判断墨西哥和巴西哪个市场更适合作为第一站，并评估主体设立、税号和平台落地周期。"],"observation":["华道观察认为，工厂进入拉美的关键不是立刻全面铺开，而是选择一个清晰切入口，把产品优势转化为本地经营能力。主体和合规是这条路径的基础设施。"],"actions":["评估现有订单、品类和渠道是否适合墨西哥或巴西先行。","明确供货、平台经营、品牌本地化三种路径的优先级。","准备主体、税号、平台资料和财税维护方案。","用阶段性目标控制投入，避免一开始就重资产铺开。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    '跨境卖家升级本土店：为什么主体、税号和合规是成交增长的前提',
    'cross-border-seller-local-store-upgrade',
    'LATAM',
    'business',
    '["跨境卖家","本土店","主体搭建","合规"]',
    '面向已有跨境店铺的卖家，分析升级墨西哥或巴西本土店前应完成的关键准备。',
    '{"sections":{"background":["许多中国卖家进入拉美时先通过跨境店铺测试市场。当产品、价格或渠道逐步验证后，升级本土店成为进一步扩大经营空间的常见选择。","本土店升级涉及的不只是店铺类型变化，还包括主体、税号、平台资料、收付款、发票和长期申报。"],"why":["本土店通常更接近本地消费者体验和平台治理要求，也更依赖真实经营身份。主体和税号会影响审核、结算、发票、活动参与和长期合规。","如果企业只关注前端流量，忽视后端合规，增长越快，风险越集中。"],"impact":["已有跨境店、稳定 SKU、平台运营团队或拉美订单基础的卖家，都应该关注本土店升级路径。","不同国家的主体、税号和税务申报差异较大，墨西哥 SA/RFC 与巴西 CNPJ 的准备节奏不能混为一谈。"],"observation":["华道观察认为，本土店升级的本质是经营身份升级。企业需要把平台机会、税务合规和长期经营放在同一张路线图里，而不是用临时资料解决长期问题。"],"actions":["盘点现有跨境店铺的销量、品类、退货和客服数据。","判断优先升级墨西哥、巴西或两国并行。","准备本地主体、税号、平台资料和财税服务机制。","把合规成本纳入毛利和定价模型。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
),
(
    'TikTok Shop 巴西动态观察：中国企业应提前准备哪些本地化能力',
    'tiktok-shop-brazil-market',
    'Brazil',
    'platform',
    '["TikTok Shop","巴西市场","达人协作","履约"]',
    '围绕内容电商、主体资质、达人协作和履约能力，分析企业布局巴西内容电商前的准备方向。',
    '{"sections":{"background":["巴西内容电商的发展，让 TikTok Shop 成为中国企业关注的新渠道。不同于传统平台，内容电商更依赖消费者对产品场景、达人表达和品牌信任的即时判断。","企业在关注平台入口的同时，也需要提前规划主体、CNPJ、税务、履约和本地服务。"],"why":["内容电商能快速放大产品关注度，也会快速暴露履约、售后和合规短板。巴西市场的语言、税务和消费者服务要求，使本地化能力成为长期经营关键。","如果后端能力不足，前端内容带来的流量未必能转化为稳定复购。"],"impact":["具备内容生产能力、品牌定位清晰或供应链响应速度快的企业，需要优先评估巴西 TikTok Shop 的适配度。","跨境卖家也应关注本地仓配、退换货和客服能力，因为这些因素会影响内容电商的用户反馈。"],"observation":["华道观察认为，TikTok Shop 巴西更像一套内容驱动的本地经营系统。企业不应只等待开放节点，而应提前建设可承接平台机会的合规和运营底座。"],"actions":["梳理巴西 CNPJ、税务和平台资料准备清单。","选择适合内容展示的产品线进行小范围验证。","提前规划葡语达人、客服和售后流程。","评估与 Mercado Livre 等平台的组合经营方式。"]}}',
    '华道出海研究团队',
    '2026-08-11',
    '2026-08-11',
    'published'
)
ON CONFLICT(slug) DO UPDATE SET
    title = excluded.title,
    country = excluded.country,
    category = excluded.category,
    tags = excluded.tags,
    summary = excluded.summary,
    content = excluded.content,
    source = excluded.source,
    publish_date = excluded.publish_date,
    update_date = excluded.update_date,
    status = excluded.status,
    updated_at = datetime('now');
