CREATE TABLE IF NOT EXISTS orda_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    orda_id UUID NOT NULL REFERENCES ordas(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orda_messages_orda_id ON orda_messages(orda_id);
CREATE INDEX IF NOT EXISTS idx_orda_messages_created_at ON orda_messages(created_at);
