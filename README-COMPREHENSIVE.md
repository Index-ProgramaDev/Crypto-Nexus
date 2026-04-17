# CryptoHub Backend Architecture & Documentation

## 1. Project Overview
CryptoHub is a large-scale real-time social network platform designed for the cryptocurrency community. It supports tiered user environments, scalable post feeds (fan-out pattern style), real-time WebSockets, and user-to-user direct messaging. 

## 2. Final Architecture (UPDATED)
The system has been meticulously upgraded to a fully functional RESTful system leveraging strong MVC separation patterns:
- **Routes Layer (`/routes`)**: Contains structured, isolated routing logic (`user, auth, feed, post, follow, chat, moderation`).
- **Controller Layer (`/controllers`)**: Standardizes input processing, utilizes Zod validation schemas, handles the async errors context uniformly.
- **Service Layer (`/services`)**: Business logic is safely decoupled (e.g., `FollowService`, `ChatService`, `PostService`). Prisma acts strictly as a dependency query layer here.
- **WebSockets Layer (`/config/socket.js`)**: Implements authenticated `ws` connections for true real-time duplex data transfer, maintaining state inside standard maps.

## 3. Tech Stack 
- **Node.js + Express**: Enterprise-standard scalable baseline for HTTP processing.
- **PostgreSQL (Neon Serverless)**: Powerful relational structuring, fully defining the social graph relations inherently via Foreign Keys.
- **Prisma**: The ORM provides raw SQL capabilities exactly when needed but allows extremely fast prototyping with generated types.
- **WebSockets (`ws`)**: Bypasses HTTP overhead to allow for instant DM interactions and feed notifications.
- **Zod**: Type inference and rigid payload validations.
- **JWT**: Stateless architecture for horizontal scaling readiness.

## 4. Setup Instructions
```bash
# 1. Install dependencies
npm install

# 2. Setup env variables
cp env.example .env

# 3. Provision DB
npx prisma migrate dev
npx prisma generate
npm run db:seed

# 4. Start Server
npm run dev
```

## 5. Environment Variables
Your `.env` file requires:
| Variable | Usage |
|----------|-------|
| `NODE_ENV` | Must be `development` or `production` |
| `PORT` | API Port (Standard `3000`) |
| `DATABASE_URL` | PostGreSQL Connection |
| `JWT_SECRET` | 256-bit Hash secret for signing |

## 6. API Documentation
*Key newly fixed endpoints:*
- **POST `/api/v1/users/:id/follow`**: Toggle follow/unfollow targeting user `id`.
- **GET `/api/v1/posts/feed`**: Returns paginated algorithm feed of users you actively follow mapping their latest `active` posts natively.
- **POST `/api/v1/chat/user/:id`**: Gets or Creates a 1-on-1 Conversation ID.
- **POST `/api/v1/chat/:conversationId/messages`**: Commits new PMs instantly.
- **WS `ws://localhost:3000?token={JWT}`**: Dedicated real-time communication pipeline.

## 7. Database Design
The Prisma model handles intensive bidirectional edges natively:
- **Graph Nodes**: `User`, `Profile`.
- **Graph Edges**: `Follow` (`followerId` -> `followingId`). This handles the feed distribution queries.
- **Content Graph**: `Post` <-> `Comment` <-> `Like`.
- **Private Graph**: `Conversation` contains `ConversationParticipant[]`. `Conversation` owns `Message[]`.

## 8. Testing Strategy (VERY DETAILED)
We utilize **Vitest** for blistering fast execution combined with **Supertest** for E2E validations:
1. **Unit Testing Services**: `PostService.getFeed` or `FollowService.toggleFollow` should be tested explicitly by utilizing `vitest-mock-extended` for the `prisma` client. Focus on edge conditions (e.g. attempting to follow yourself).
2. **Integration Flow Tests**: Spin up a Dockerized PostgreSQL. Pre-seed users -> Follow user -> Create post. Use `supertest` to assert that the `GET /feed` endpoint reliably pulls exactly 1 payload containing the followed user's post. Validate the JWT guards work natively.
3. **Mocks**: External services (Emails, S3) are wrapped in utility interfaces naturally. Avoid unit-testing the network.

## 9. Security Strategy
- **Zod Guards**: Hard validations at API layer. Bad inputs do not hit Prisma.
- **Auth Tokens**: Handled via Signed non-extractable JWTs.
- **XSS/CSRF**: Inputs are heavily sanitized via `isomorphic-dompurify` implicitly at post time.
- **DDoS/Abuse**: `express-rate-limit` prevents brute-force logins and spam messages tracking via IP structures.

## 10. Performance & Scaling Strategy
1. **DB Indexing**: Prisma `@@index` properties specifically target relations such as `userId`, `conversationId`, minimizing search scan sweeps.
2. **Serverless Driver Prep**: Neon natively pools connections. 
3. **Stateless Scale**: Auth state is strictly offloaded to JWTs. Multiple server nodes can be spun without session-affinity tracking.

---

## 11. ⚠️ WHAT IS STILL MISSING / LIMITATIONS (BRUTAL FINAL ANALYSIS)
Assuming we scale to **1,000,000+ active users**, this architecture WILL crash unless the following bottlenecks are handled. **DO NOT treat this codebase as finished.** 

1. **Massive Feed Fetch Crash (Database Fan-out issue)**
   - *The Bottleneck*: The `getFeed` query dynamically resolves: `SELECT * FROM followers UNION user posts`. At scale (e.g., following 10,000 people), this database query will buckle catastrophically producing incredibly slow latency.
   - *Fix*: You absolutely MUST implement a **Redis Fan-out approach**. On Post creation, a Background Worker (`BullMQ`) pushes the Post ID onto the Redis List of every Active Follower natively so feeds are returned in O(1) time without SQL table sweeps.

2. **Synchronous Notification Nightmares**
   - *The Bottleneck*: Our `FollowService` creates Prisma notifications synchronously directly inside an HTTP handler in conjunction with standard DB transactions! This breaks if heavy.
   - *Fix*: Transition to an Async EventBus (Message Queue / RabbitMQ) for non-core tasks. Emit an event internally; let a worker spawn the notification.

3. **No S3 / CDN Integration**
   - *The Bottleneck*: We accept `mediaUrls`. How are they uploaded securely? If users upload direct blobs to Express, our CPU crashes attempting to encode. 
   - *Fix*: Move instantly to Pre-Signed S3 URLs natively executed client-side. The backend should ONLY deal with generating temporary AWS keys and storing the resulting String paths.

4. **WebSocket Scale Constraints**
   - *The Bottleneck*: The new WebSockets system uses a simple JS `Map(UserId, socket)`. Memory leak limits aside, this breaks inherently when scaling across 3+ server instances behind an AWS Load Balancer because the maps don't talk (User A is on Server 1; User B is on Server 2).
   - *Fix*: Migrate directly to **Redis Pub/Sub** routing (Socket.io-redis-adapter) backing up the WebSocket pipeline to enforce multi-node packet delivery.

Everything else works brilliantly natively, but you CANNOT go viral on Monday without Redis and AWS S3 firmly hooked into this stack context.
