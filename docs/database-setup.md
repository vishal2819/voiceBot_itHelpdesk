# Database Setup Guide

## Option 1: Local PostgreSQL with Docker (Recommended)

1. **Start PostgreSQL container**

   ```bash
   docker compose up -d
   ```

2. **Verify connection**

   ```bash
   docker compose ps
   ```

3. **Run migrations**

   ```bash
   npm run prisma:migrate
   ```

4. **Seed database**

   ```bash
   npm run prisma:seed
   ```

## Option 2: Cloud PostgreSQL (Supabase/Railway/Render)

1. **Create a PostgreSQL database** on your preferred platform
   - [Supabase](https://supabase.com) - Free tier available
   - [Railway](https://railway.app) - Free tier available
   - [Render](https://render.com) - Free tier available

2. **Update DATABASE_URL in `.env`**

   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname?schema=public
   ```

3. **Run migrations**

   ```bash
   npm run prisma:migrate
   ```

4. **Seed database**

   ```bash
   npm run prisma:seed
   ```

## Database Schema

### Tables Created

1. **service_catalog** - IT service types and pricing
   - Wi-Fi not working: $20
   - Email login issues: $15
   - Slow laptop performance: $25
   - Printer problems: $10

2. **tickets** - Customer support tickets
   - Stores name, email, phone, address, issue details
   - Status tracking (CREATED, IN_PROGRESS, RESOLVED, CANCELLED)
   - Optimistic locking with version field

3. **conversation_logs** - Debugging and analytics
   - Tracks conversation state transitions
   - Stores user/bot messages
   - Records tool calls and metadata

## Useful Commands

- **View database in Prisma Studio**

  ```bash
  npx prisma studio
  ```

- **Reset database (WARNING: deletes all data)**

  ```bash
  npx prisma migrate reset
  ```

- **Create new migration**

  ```bash
  npx prisma migrate dev --name description
  ```
