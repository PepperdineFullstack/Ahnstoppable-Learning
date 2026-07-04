-- ============================================================
--  Discussion Board  –  PostgreSQL Schema
-- ============================================================
 
-- Users (students AND professors share the same table; role distinguishes them)
CREATE TABLE users (
    id          SERIAL PRIMARY KEY,
    email       TEXT NOT NULL UNIQUE,
    password    TEXT,                   -- bcrypt hash; NULL for Google-only accounts
    name        TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'student'  -- 'student' | 'professor'
                CHECK (role IN ('student','professor')),
    google_id   TEXT UNIQUE,            -- Google profile id (TEXT: too large for INT)
    avatar      TEXT,                   -- profile photo URL from Google
    talents     INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Classes
CREATE TABLE classes (
    id          SERIAL PRIMARY KEY,
    title       TEXT NOT NULL,          -- e.g. "ADV 375"
    section     TEXT,                   -- e.g. "Section 01"
    start_time  TIME,
    end_time    TIME,
    join_code   TEXT NOT NULL UNIQUE,   -- professor shares this 6-char code
    professor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Class memberships (students enrolled in classes)
CREATE TABLE class_members (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, class_id)
);
 
-- Discussion posts (created by professors)
CREATE TABLE posts (
    id          SERIAL PRIMARY KEY,
    class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    post_date   DATE NOT NULL DEFAULT CURRENT_DATE,  -- used for day-by-day view
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Comments on posts (students or professor)
CREATE TABLE comments (
    id          SERIAL PRIMARY KEY,
    post_id     INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Replies to comments
CREATE TABLE replies (
    id          SERIAL PRIMARY KEY,
    comment_id  INTEGER NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Understanding check responses (👍 👋 👎) – one current response per user per class
CREATE TABLE understand_checks (
    id          SERIAL PRIMARY KEY,
    class_id    INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    response    TEXT NOT NULL CHECK (response IN ('thumbs_up','hand','thumbs_down')),
    checked_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (class_id, user_id)
);
 
-- Indexes for common query patterns
CREATE INDEX idx_posts_class_date   ON posts(class_id, post_date);
CREATE INDEX idx_comments_post      ON comments(post_id);
CREATE INDEX idx_replies_comment    ON replies(comment_id);
CREATE INDEX idx_members_class      ON class_members(class_id);