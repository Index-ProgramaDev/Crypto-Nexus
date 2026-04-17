-- ==========================================
-- CRYPTOHUB SOCIAL MEDIA - COMPLETE SCHEMA
-- Optimized for NeonDB / PostgreSQL
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- ENUM TYPES
-- ==========================================

CREATE TYPE user_role AS ENUM ('user', 'mentored', 'advanced', 'admin');
CREATE TYPE content_status AS ENUM ('active', 'deleted', 'suspended');
CREATE TYPE notification_type AS ENUM ('like', 'comment', 'follow', 'mention', 'message', 'alert');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');

-- ==========================================
-- CORE TABLES
-- ==========================================

-- Users Table (Auth + Basic Info)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'user',
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Profiles Table (Extended User Info - Normalized)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    bio TEXT,
    avatar_url TEXT,
    location VARCHAR(255),
    website VARCHAR(255),
    birth_date DATE,
    is_private BOOLEAN DEFAULT FALSE,
    followers_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    posts_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessions Table (Authentication)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Posts Table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    media_urls TEXT[], -- Array of media URLs
    status content_status DEFAULT 'active',
    is_pinned BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Comments Table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL,
    status content_status DEFAULT 'active',
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Likes Table (Polymorphic - can like posts or comments)
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Ensure only one of post_id or comment_id is set
    CONSTRAINT like_target_check CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    -- Prevent duplicate likes
    CONSTRAINT unique_post_like UNIQUE (user_id, post_id),
    CONSTRAINT unique_comment_like UNIQUE (user_id, comment_id)
);

-- Follows Table
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Prevent self-follows
    CONSTRAINT no_self_follow CHECK (follower_id != following_id),
    -- Prevent duplicate follows
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id)
);

-- Notifications Table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Recipient
    actor_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Who triggered the notification
    type notification_type NOT NULL,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table (Private Chat)
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Participants (Many-to-Many)
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMP,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[],
    status message_status DEFAULT 'sent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Profiles indexes
CREATE INDEX idx_profiles_user_id ON profiles(user_id);

-- Sessions indexes
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Posts indexes (CRITICAL for feed performance)
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC);
CREATE INDEX idx_posts_pinned ON posts(user_id, is_pinned) WHERE is_pinned = TRUE;

-- Comments indexes
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Likes indexes
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_comment_id ON likes(comment_id);

-- Follows indexes (CRITICAL for feed queries)
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Messages indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conversation_participants_conv ON conversation_participants(conversation_id);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update followers/following counts
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
        UPDATE profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
        UPDATE profiles SET followers_count = followers_count - 1 WHERE user_id = OLD.following_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER follow_counts_trigger
    AFTER INSERT OR DELETE ON follows
    FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- Function to update post counts
CREATE OR REPLACE FUNCTION update_post_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET posts_count = posts_count + 1 WHERE user_id = NEW.user_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET posts_count = posts_count - 1 WHERE user_id = OLD.user_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_counts_trigger
    AFTER INSERT OR DELETE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_post_counts();

-- ==========================================
-- SEED DATA
-- ==========================================

-- Users (5 users)
INSERT INTO users (id, email, username, password_hash, role, email_verified) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'alice@example.com', 'alice_crypto', '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'admin', TRUE),
    ('550e8400-e29b-41d4-a716-446655440001', 'bob@example.com', 'bob_trader', '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'advanced', TRUE),
    ('550e8400-e29b-41d4-a716-446655440002', 'carol@example.com', 'carol_hodl', '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'mentored', TRUE),
    ('550e8400-e29b-41d4-a716-446655440003', 'dave@example.com', 'dave_defi', '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'user', TRUE),
    ('550e8400-e29b-41d4-a716-446655440004', 'eve@example.com', 'eve_nft', '$2b$12$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'user', FALSE);

-- Profiles
INSERT INTO profiles (user_id, full_name, bio, avatar_url, location, website) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'Alice Johnson', 'Crypto enthusiast and blockchain developer', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice', 'New York', 'https://alice.dev'),
    ('550e8400-e29b-41d4-a716-446655440001', 'Bob Smith', 'Day trader and technical analyst', 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob', 'London', 'https://bobtrades.com'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Carol Williams', 'HODLer since 2017', 'https://api.dicebear.com/7.x/avataaars/svg?seed=carol', 'San Francisco', NULL),
    ('550e8400-e29b-41d4-a716-446655440003', 'Dave Brown', 'DeFi researcher', 'https://api.dicebear.com/7.x/avataaars/svg?seed=dave', 'Berlin', 'https://davedefi.io'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Eve Davis', 'NFT collector and artist', 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve', 'Tokyo', 'https://evenfts.art');

-- Posts
INSERT INTO posts (id, user_id, content, media_urls, likes_count, comments_count) VALUES
    ('660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Bitcoin just broke $70k! 🚀 This bull run is going to be epic. #BTC #Crypto', ARRAY['https://picsum.photos/800/400?random=1'], 15, 3),
    ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 'Technical analysis shows strong support at $65k. Time to accumulate? 📊', ARRAY['https://picsum.photos/800/400?random=2'], 8, 5),
    ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', 'Remember: Not your keys, not your coins. Stay safe out there! 🔐', NULL, 25, 7),
    ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', 'New DeFi protocol launching next week. Early access for followers! 🌟', ARRAY['https://picsum.photos/800/400?random=3'], 42, 12),
    ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Ethereum 2.0 staking rewards are looking juicy right now 💰', NULL, 31, 4),
    ('660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'Just minted my latest NFT collection! Check it out 🎨', ARRAY['https://picsum.photos/800/400?random=4', 'https://picsum.photos/800/400?random=5'], 18, 2);

-- Comments
INSERT INTO comments (id, post_id, user_id, content, likes_count) VALUES
    ('770e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Totally agree! I bought more at $68k', 5),
    ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'HODLing since 2017, this is nothing new 😎', 8),
    ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'What indicators are you looking at?', 2),
    ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Interested in early access! DM me?', 3),
    ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440003', 'Love the art style! Is it on OpenSea?', 1);

-- Likes (Posts)
INSERT INTO likes (user_id, post_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000'),
    ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440000'),
    ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440000'),
    ('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440003'),
    ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440003'),
    ('550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440003');

-- Follows
INSERT INTO follows (follower_id, following_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'), -- Bob follows Alice
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000'), -- Carol follows Alice
    ('550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000'), -- Dave follows Alice
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001'), -- Alice follows Bob
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000'), -- Eve follows Alice
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003'), -- Bob follows Dave
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003'); -- Carol follows Dave

-- Conversations & Messages
INSERT INTO conversations (id) VALUES
    ('880e8400-e29b-41d4-a716-446655440000');

INSERT INTO conversation_participants (conversation_id, user_id) VALUES
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000'),
    ('880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001');

INSERT INTO messages (id, conversation_id, sender_id, content, status) VALUES
    ('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Hey Bob! Saw your analysis on BTC, great insights! 👏', 'read'),
    ('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Thanks Alice! Are you planning to enter a position?', 'read'),
    ('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000', 'Thinking about it, waiting for a better entry point 📉', 'delivered');

-- Notifications
INSERT INTO notifications (user_id, actor_id, type, post_id, message) VALUES
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'like', '660e8400-e29b-41d4-a716-446655440000', 'Bob liked your post'),
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', 'like', '660e8400-e29b-41d4-a716-446655440000', 'Carol liked your post'),
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'comment', '660e8400-e29b-41d4-a716-446655440000', 'Bob commented on your post'),
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'follow', NULL, 'Alice started following you'),
    ('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'follow', NULL, 'Alice started following you');

-- ==========================================
-- TEST QUERIES
-- ==========================================

-- TEST 1: User Feed (Posts from followed users)
-- Expected: Returns posts from users that Alice follows (Bob and Dave)
SELECT 
    p.id,
    p.content,
    p.created_at,
    u.username,
    u.id as user_id,
    p.likes_count,
    p.comments_count
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.user_id IN (
    SELECT following_id FROM follows WHERE follower_id = '550e8400-e29b-41d4-a716-446655440000'
)
AND p.status = 'active'
ORDER BY p.created_at DESC;

-- TEST 2: User Profile with Stats
-- Expected: Returns Alice profile with followers=3, following=2, posts=2
SELECT 
    u.email,
    u.username,
    p.full_name,
    p.bio,
    p.avatar_url,
    p.followers_count,
    p.following_count,
    p.posts_count
FROM users u
JOIN profiles p ON u.id = p.user_id
WHERE u.id = '550e8400-e29b-41d4-a716-446655440000';

-- TEST 3: Add Like (should work)
-- Expected: Success, no error
INSERT INTO likes (user_id, post_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440000');

-- TEST 4: Prevent Duplicate Like (should fail)
-- Expected: ERROR - unique constraint violation
-- INSERT INTO likes (user_id, post_id) VALUES
--     ('550e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440000');

-- TEST 5: Follow User (should work)
-- Expected: Success, triggers update follower counts
INSERT INTO follows (follower_id, following_id) VALUES
    ('550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001');

-- TEST 6: Prevent Self-Follow (should fail)
-- Expected: ERROR - check constraint violation
-- INSERT INTO follows (follower_id, following_id) VALUES
--     ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440000');

-- TEST 7: Prevent Duplicate Follow (should fail)
-- Expected: ERROR - unique constraint violation
-- INSERT INTO follows (follower_id, following_id) VALUES
--     ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000');

-- TEST 8: Get User Notifications
-- Expected: Returns 3 notifications for Alice (2 likes, 1 comment, 2 follows)
SELECT 
    n.id,
    n.type,
    n.message,
    n.is_read,
    n.created_at,
    u.username as actor_username
FROM notifications n
LEFT JOIN users u ON n.actor_id = u.id
WHERE n.user_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY n.created_at DESC;

-- TEST 9: Get Conversation Messages
-- Expected: Returns 3 messages between Alice and Bob
SELECT 
    m.id,
    m.content,
    m.status,
    m.created_at,
    u.username as sender
FROM messages m
JOIN users u ON m.sender_id = u.id
WHERE m.conversation_id = '880e8400-e29b-41d4-a716-446655440000'
ORDER BY m.created_at;

-- TEST 10: Get Post with Comments (Avoid N+1)
-- Expected: Returns post with all comments in single query
SELECT 
    p.id as post_id,
    p.content as post_content,
    p.likes_count,
    p.comments_count,
    json_agg(
        json_build_object(
            'id', c.id,
            'content', c.content,
            'username', cu.username,
            'likes_count', c.likes_count,
            'created_at', c.created_at
        ) ORDER BY c.created_at
    ) FILTER (WHERE c.id IS NOT NULL) as comments
FROM posts p
LEFT JOIN comments c ON p.id = c.post_id AND c.status = 'active'
LEFT JOIN users cu ON c.user_id = cu.id
WHERE p.id = '660e8400-e29b-41d4-a716-446655440000'
GROUP BY p.id, p.content, p.likes_count, p.comments_count;

-- TEST 11: Delete User (CASCADE Test)
-- Expected: Deletes user and all related data (posts, comments, likes, follows, etc.)
-- WARNING: This is destructive!
-- DELETE FROM users WHERE id = '550e8400-e29b-41d4-a716-446655440004';

-- TEST 12: Prevent Duplicate Email (should fail)
-- Expected: ERROR - unique constraint violation
-- INSERT INTO users (id, email, username, password_hash) VALUES
--     ('550e8400-e29b-41d4-a716-446655440005', 'alice@example.com', 'new_alice', 'hash123');

-- TEST 13: Search Users
-- Expected: Returns users matching search term
SELECT id, username, email, full_name, avatar_url
FROM users u
LEFT JOIN profiles p ON u.id = p.user_id
WHERE 
    username ILIKE '%crypto%' 
    OR full_name ILIKE '%alice%'
    OR email ILIKE '%example%'
LIMIT 20;

-- TEST 14: Trending Posts (by likes in last 7 days)
-- Expected: Returns posts sorted by engagement
SELECT 
    p.id,
    p.content,
    u.username,
    p.likes_count,
    p.comments_count,
    p.created_at
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    AND p.status = 'active'
ORDER BY (p.likes_count + p.comments_count * 2) DESC
LIMIT 10;

-- TEST 15: User Followers List
-- Expected: Returns all followers of Alice with profiles
SELECT 
    u.id,
    u.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    f.created_at as followed_at
FROM follows f
JOIN users u ON f.follower_id = u.id
LEFT JOIN profiles p ON u.id = p.user_id
WHERE f.following_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY f.created_at DESC;

-- ==========================================
-- SCALABILITY NOTES (For Future)
-- ==========================================

/*
PARTITIONING STRATEGY for high volume:

1. Posts Table: Partition by range on created_at (monthly)
   - Old partitions can be archived
   - Hot data stays fast

2. Messages Table: Partition by hash on conversation_id
   - Distributes writes evenly
   - Keeps conversation data together

3. Notifications Table: Partition by list on user_id
   - Each user's notifications in separate partition
   - Easy cleanup of old notifications

SHARDING CONSIDERATIONS:
- Shard by user_id hash for user-related tables
- Keep conversations on same shard
- Use consistent hashing for even distribution

READ REPLICAS:
- Feed queries → Replica
- User profiles → Replica
- Write operations → Primary
*/
