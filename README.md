# Lost & Found College API

Backend service for a college "Lost & Found" application. Built with Node.js, Express, and PostgreSQL.

## Features
- User Auth (Register/Login) with JWT
- Lost/Found Item Posting with Image Upload (Cloudinary)
- Admin Panel (Approve/Verify Posts)
- Role-based Access Control (RBAC)

## Tech Stack
- **Backend:** Node.js, Express
- **Database:** PostgreSQL (using `pg` pool)
- **Image Storage:** Cloudinary
- **Auth:** bcryptjs, jsonwebtoken
- **Infrastructure:** Docker, Docker Compose

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (Optional, for local DB)
- Cloudinary Account (for image uploads)

### Installation
1. Clone the repository.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and fill in your credentials.
4. Run migrations on your Postgres instance using the script in `migrations/001_initial_schema.sql`.

### Running with Docker
```bash
docker-compose --file docker/docker-compose.yml up --build
```

### Development
```bash
npm run dev
```

## API Endpoints

### Student
- `POST /api/v1/student/register` - User registration
- `POST /api/v1/student/login` - User login
- `POST /api/v1/student/post-item` - Post a lost/found item (Protected)

### Admin
- `GET /api/v1/admin/all-posts` - View all items (Protected: Admin)
- `PATCH /api/v1/admin/update-status/:itemId` - Update item status (Protected: Admin)
