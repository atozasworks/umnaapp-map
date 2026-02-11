# Deployment Guide for VPS

## Prerequisites

- Ubuntu/Debian VPS
- Domain name (optional but recommended)
- SSH access to server

## Step 1: Server Initial Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js using nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Install PM2
npm install -g pm2

# Install Nginx
sudo apt install nginx -y
```

## Step 2: Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt:
CREATE DATABASE umnaapp;
CREATE USER umnaapp_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE umnaapp TO umnaapp_user;
\q
```

## Step 3: Clone and Build Application

```bash
# Clone repository
git clone <your-repo-url>
cd umnaapp

# Install dependencies
npm run install:all

# Build frontend
cd frontend
npm run build
cd ..
```

## Step 4: Configure Backend

```bash
cd backend

# Copy environment template
cp env.example.txt .env

# Edit .env with production values
nano .env
```

Update these values in `.env`:
```env
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://umnaapp_user:your_secure_password@localhost:5432/umnaapp"
FRONTEND_URL=https://yourdomain.com
GOOGLE_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback
JWT_SECRET=your-production-jwt-secret
# ... other production values
```

## Step 5: Run Database Migrations

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

## Step 6: Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/umnaapp
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        root /path/to/umnaapp/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/umnaapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 7: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will automatically update your Nginx configuration for HTTPS.

## Step 8: Start Application with PM2

```bash
cd /path/to/umnaapp/backend
pm2 start server.js --name umnaapp-backend
pm2 save
pm2 startup
```

Follow the instructions from `pm2 startup` to enable auto-start on reboot.

## Step 9: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Update OAuth 2.0 redirect URI to:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```

## Step 10: Firewall Configuration

```bash
# Allow HTTP, HTTPS, and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## Monitoring

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs umnaapp-backend

# Restart application
pm2 restart umnaapp-backend

# Check Nginx status
sudo systemctl status nginx
```

## Troubleshooting

### Application not starting
- Check PM2 logs: `pm2 logs umnaapp-backend`
- Verify database connection in `.env`
- Check if port 5000 is available: `sudo netstat -tulpn | grep 5000`

### Nginx errors
- Test configuration: `sudo nginx -t`
- Check error logs: `sudo tail -f /var/log/nginx/error.log`

### Database connection issues
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Test connection: `psql -U umnaapp_user -d umnaapp -h localhost`

### SSL certificate issues
- Renew certificate: `sudo certbot renew`
- Check certificate status: `sudo certbot certificates`

