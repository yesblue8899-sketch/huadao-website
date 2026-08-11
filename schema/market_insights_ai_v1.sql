ALTER TABLE market_insights ADD COLUMN impact_level TEXT NOT NULL DEFAULT 'B';
ALTER TABLE market_insights ADD COLUMN impact_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_insights ADD COLUMN business_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_insights ADD COLUMN content_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_insights ADD COLUMN total_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE market_insights ADD COLUMN ai_generated INTEGER NOT NULL DEFAULT 0 CHECK (ai_generated IN (0, 1));
ALTER TABLE market_insights ADD COLUMN review_status TEXT NOT NULL DEFAULT 'approved' CHECK (review_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE market_insights ADD COLUMN source_url TEXT;
ALTER TABLE market_insights ADD COLUMN source_published_date TEXT;

CREATE INDEX IF NOT EXISTS idx_market_insights_review_status ON market_insights (review_status);
CREATE INDEX IF NOT EXISTS idx_market_insights_impact_level ON market_insights (impact_level);

UPDATE market_insights
SET ai_generated = 0,
    review_status = 'approved',
    impact_level = CASE
        WHEN impact_level IS NULL OR impact_level = '' THEN 'B'
        ELSE impact_level
    END
WHERE status = 'published';

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
