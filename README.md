# KettleTrack

> Never argue about whose turn it is to wash the kettle again.

KettleTrack is a modern web application designed to solve the age-old roommate dilemma: who washed the kettle last, and whose turn is it next? It features group tracking, intelligent rotation cycles, and a "favor" system for when someone covers a wash for someone else out of turn.

## Features

- **Group Workspaces**: Create a room and share a 6-letter join code with your housemates or colleagues.
- **Smart Rotation Cycles**: Easily track whose turn it is to wash next.
- **Drag & Drop Reordering**: Reorder the washing cycle seamlessly on both mobile (touch-and-hold) and desktop.
- **Favor System**: If it's Alice's turn, but Bob washes the kettle instead, the app automatically tracks that Alice owes Bob a favor.
- **Secure Authentication**: Passwordless magic links and Google OAuth powered by Supabase.
- **Modern UI/UX**: Beautiful, responsive, mobile-first design with full dark mode support.

## Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **Database ORM**: [Prisma](https://www.prisma.io/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Drag & Drop**: [@dnd-kit](https://dndkit.com/)

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A [Supabase](https://supabase.com/) account (for Auth and PostgreSQL Database)

### 1. Clone the repository

```bash
git clone https://github.com/prometheus0028/KettleTrack.git
cd KettleTrack
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root of the project and add your Supabase credentials:

```env
# Database connection string from Supabase (Transaction connection)
DATABASE_URL="postgres://postgres.xxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection string for Prisma migrations
DIRECT_URL="postgres://postgres.xxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# Supabase Auth Keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### 4. Setup the Database

Push the Prisma schema to your database to create the necessary tables:

```bash
npx prisma db push
```

Generate the Prisma Client:

```bash
npx prisma generate
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License

This project is licensed under the MIT License.
