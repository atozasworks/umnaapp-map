# Database Setup Guide for UMNAAPP

## Option 1: Install PostgreSQL Locally (Windows)

### Step 1: Download and Install PostgreSQL

1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer
3. During installation:
   - Remember the password you set for the `postgres` superuser
   - Default port: `5432`
   - Default installation path: `C:\Program Files\PostgreSQL\[version]`

### Step 2: Add PostgreSQL to PATH (Optional but Recommended)

1. Find your PostgreSQL installation directory (usually `C:\Program Files\PostgreSQL\[version]\bin`)
2. Add it to your system PATH:
   - Right-click "This PC" → Properties → Advanced System Settings
   - Click "Environment Variables"
   - Under "System Variables", find "Path" and click "Edit"
   - Click "New" and add: `C:\Program Files\PostgreSQL\[version]\bin`
   - Click OK on all dialogs

### Step 3: Create Database and User

Open Command Prompt or PowerShell and run:

```bash
# Connect to PostgreSQL (use the password you set during installation)
psql -U postgres

# Once connected, run these SQL commands:
CREATE DATABASE umnaapp;
CREATE USER umnaapp_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE umnaapp TO umnaapp_user;

# Exit PostgreSQL
\q
```

### Step 4: Update .env File

Edit `backend/.env` and update the DATABASE_URL:

```env
DATABASE_URL="postgresql://umnaapp_user:your_secure_password_here@localhost:5432/umnaapp?schema=public"
```

### Step 5: Run Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

---

## Option 2: Use Cloud Database (Easier - Recommended for Quick Start)

### Using Supabase (Free Tier Available)

1. Go to https://supabase.com
2. Sign up for a free account
3. Create a new project
4. Go to Project Settings → Database
5. Copy the "Connection string" (URI format)
6. Update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"
```

7. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

### Using Neon (Free Tier Available)

1. Go to https://neon.tech
2. Sign up and create a new project
3. Copy the connection string
4. Update `backend/.env` with the connection string
5. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

### Using Railway (Free Tier Available)

1. Go to https://railway.app
2. Sign up and create a new project
3. Add a PostgreSQL database
4. Copy the connection string from the database service
5. Update `backend/.env`
6. Run migrations:
```bash
cd backend
npx prisma migrate deploy
```

---

## Option 3: Use Docker (If You Have Docker Installed)

### Step 1: Create docker-compose.yml

Create a file `docker-compose.yml` in the project root:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: umnaapp-db
    environment:
      POSTGRES_USER: umnaapp_user
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: umnaapp
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Step 2: Start Database

```bash
docker-compose up -d
```

### Step 3: Update .env

```env
DATABASE_URL="postgresql://umnaapp_user:your_secure_password@localhost:5432/umnaapp?schema=public"
```

### Step 4: Run Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

---

## Quick Test Connection

After setting up, test the connection:

```bash
cd backend
npx prisma db pull
```

If this works without errors, your database is connected correctly!

---

## Troubleshooting

### "Authentication failed" Error

- Check that the username and password in `.env` match your database credentials
- Verify the database exists
- Check that the user has proper permissions

### "Connection refused" Error

- Make sure PostgreSQL service is running
- Check the port (default is 5432)
- Verify firewall settings

### Windows: "psql not recognized"

- PostgreSQL might not be in your PATH
- Use full path: `"C:\Program Files\PostgreSQL\[version]\bin\psql.exe" -U postgres`
- Or use pgAdmin (GUI tool that comes with PostgreSQL)

---

## Recommended: Use Cloud Database

For development, I **highly recommend using a cloud database** (Supabase, Neon, or Railway) because:
- ✅ No local installation needed
- ✅ Works immediately
- ✅ Free tier available
- ✅ Easy to share with team
- ✅ Can access from anywhere

