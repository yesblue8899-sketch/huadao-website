CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    company TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_method TEXT NOT NULL,
    market TEXT NOT NULL,
    stage TEXT NOT NULL,
    business_status TEXT NOT NULL,
    source_channel TEXT NOT NULL DEFAULT '官网',
    page_url TEXT,
    referrer TEXT,
    user_agent TEXT,
    ip TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads (submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source_channel ON leads (source_channel);
CREATE INDEX IF NOT EXISTS idx_leads_market ON leads (market);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status);
