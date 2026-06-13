-- ========================================================
-- CAMPUSCRYPT — EXTENSIONS & CLEANUP
-- ========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if re-running script to prevent migration conflicts
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS replies CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- ========================================================
-- 1. POSTS TABLE DEFINITION
-- ========================================================
CREATE TABLE posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    category TEXT DEFAULT 'general' CHECK (category IN ('cs101', 'math201', 'professor', 'campus', 'general')),
    likes_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 2. REPLIES TABLE DEFINITION
-- ========================================================
CREATE TABLE replies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 280),
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================================
-- 3. LIKES TABLE DEFINITION
-- ========================================================
CREATE TABLE likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Guarantees a single device session can only like a distinct post once
    CONSTRAINT unique_post_like UNIQUE (post_id, session_id)
);

-- ========================================================
-- 4. HIGH-SPEED PERFORMANCE INDEXES
-- ========================================================
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_replies_post_id ON replies(post_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);

-- ========================================================
-- 5. AUTOMATION TRIGGERS (DATABASE BUSINESS LOGIC)
-- ========================================================

-- A. Automate Like Counter Sync (Increments/Decrements on changes to 'likes')
CREATE OR REPLACE FUNCTION handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_like
AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION handle_post_like();

-- B. Automate Comment Counter Sync (Increments/Decrements on changes to 'replies')
CREATE OR REPLACE FUNCTION handle_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET reply_count = reply_count - 1 WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_reply_added
AFTER INSERT OR DELETE ON replies
FOR EACH ROW EXECUTE FUNCTION handle_reply_count();

-- ========================================================
-- 6. ROW LEVEL SECURITY (RLS) FIREWALL RULES
-- ========================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Posts Table Rules
CREATE POLICY "Anyone can read posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert posts" ON posts FOR INSERT WITH CHECK (true);

CREATE POLICY "Authors can delete own posts within 5 mins" ON posts 
    FOR DELETE 
    USING (session_id = current_setting('request.headers', true)::json->>'x-session-id' AND created_at > NOW() - INTERVAL '5 minutes');

-- Replies Table Rules
CREATE POLICY "Anyone can read replies" ON replies FOR SELECT USING (true);
CREATE POLICY "Anyone can insert replies" ON replies FOR INSERT WITH CHECK (true);

-- Likes Table Rules
CREATE POLICY "Anyone can view likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Sessions can manage their own likes" ON likes 
    FOR ALL 
    USING (session_id = current_setting('request.headers', true)::json->>'x-session-id');