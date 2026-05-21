# 🚀 Deploy to AWS with GitHub Actions + Nginx

## Architecture Overview

```
GitHub Push → GitHub Actions → Build Docker Images → Push to ECR
                                                         ↓
                                              SSH into EC2 → docker compose up
                                                         ↓
Internet → Route 53 (Domain) → EC2 (Nginx:80/443) → Microservices (internal)
```

## What AWS Services You'll Use

| Service | Purpose | Cost |
|---------|---------|------|
| **EC2** (t3.medium) | Runs all Docker containers | ~$30/mo |
| **ECR** | Stores your Docker images | ~$1/mo |
| **Route 53** | Domain DNS | ~$0.50/mo |
| **ACM** | Free SSL certificate | Free |
| **Secrets Manager** | Store .env secrets | ~$0.40/mo |

> [!IMPORTANT]
> **Total cost ~$32/month.** Use a `t3.medium` (2 vCPU, 4GB RAM) minimum for 6 microservices.

---

## PHASE 1 — AWS Setup (One-Time)

### Step 1.1 — Create an EC2 Instance

1. Go to **AWS Console → EC2 → Launch Instance**
2. Choose:
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance type**: `t3.medium`
   - **Key pair**: Create new → download `.pem` file → save it safely
   - **Security Group**: Add these inbound rules:

| Port | Protocol | Source | Purpose |
|------|----------|--------|---------|
| 22 | TCP | Your IP | SSH access |
| 80 | TCP | 0.0.0.0/0 | HTTP |
| 443 | TCP | 0.0.0.0/0 | HTTPS |

3. **Storage**: 20 GB minimum
4. Launch the instance

### Step 1.2 — Install Docker on EC2

SSH into your EC2:
```bash
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

Then run:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add ubuntu user to docker group (no sudo needed)
sudo usermod -aG docker ubuntu

# Install Docker Compose v2
sudo apt install docker-compose-plugin -y

# Install AWS CLI
sudo apt install awscli -y

# Logout and login again for group changes
exit
```

### Step 1.3 — Create ECR Repositories

In **AWS Console → ECR → Create Repository** for each service:

```
healthcare/nginx
healthcare/frontend
healthcare/auth-service
healthcare/user-service
healthcare/doctor-service
healthcare/appointment-service
healthcare/habit-service
healthcare/ai-service
```

Or do it via CLI:
```bash
# Run this on your local machine (AWS CLI must be configured)
for service in nginx frontend auth-service user-service doctor-service appointment-service habit-service ai-service; do
  aws ecr create-repository --repository-name healthcare/$service --region ap-south-1
done
```

> [!NOTE]
> Use `ap-south-1` (Mumbai) for lowest latency in India.

### Step 1.4 — Create IAM User for GitHub Actions

1. Go to **IAM → Users → Create User** → Name: `github-actions-deploy`
2. Attach these policies:
   - `AmazonEC2ContainerRegistryFullAccess`
   - `AmazonEC2FullAccess` (or create a custom one)
3. Create **Access Key** → Save the `Access Key ID` and `Secret Access Key`

---

## PHASE 2 — GitHub Secrets Setup

Go to your GitHub Repo → **Settings → Secrets and Variables → Actions → New repository secret**

Add all these secrets:

```
AWS_ACCESS_KEY_ID         → (from IAM user above)
AWS_SECRET_ACCESS_KEY     → (from IAM user above)
AWS_REGION                → ap-south-1
AWS_ACCOUNT_ID            → (your 12-digit AWS account ID)
EC2_HOST                  → (EC2 public IP or domain)
EC2_USERNAME              → ubuntu
EC2_SSH_KEY               → (paste entire contents of your .pem file)

# Your app secrets (from each service's .env)
MONGO_URI                 → (your MongoDB Atlas URI)
JWT_SECRET                → (your JWT secret)
GEMINI_API_KEY            → (your Gemini key)
FRONTEND_URL              → https://yourdomain.com
# ... add all other secrets from your .env files
```

---

## PHASE 3 — Create GitHub Actions Workflow

Create this file in your repo:

### `.github/workflows/deploy.yml`

```yaml
name: 🚀 Deploy to AWS EC2

on:
  push:
    branches:
      - main         # Deploy on push to main
  workflow_dispatch: # Allow manual trigger

env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  ECR_REGISTRY: ${{ secrets.AWS_ACCOUNT_ID }}.dkr.ecr.${{ secrets.AWS_REGION }}.amazonaws.com
  IMAGE_TAG: ${{ github.sha }}

jobs:
  # ──────────────────────────────────────────────────────────────────
  # JOB 1: Build & Push Docker Images to ECR
  # ──────────────────────────────────────────────────────────────────
  build-and-push:
    name: 🐳 Build & Push Images
    runs-on: ubuntu-latest

    steps:
      - name: ⬇️ Checkout code
        uses: actions/checkout@v4

      - name: 🔐 Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: 🔑 Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v2

      # ── Build & Push Each Service ──────────────────────────────────

      - name: 🏗️ Build & Push Nginx
        run: |
          docker build -t $ECR_REGISTRY/healthcare/nginx:$IMAGE_TAG ./nginx
          docker push $ECR_REGISTRY/healthcare/nginx:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/nginx:$IMAGE_TAG $ECR_REGISTRY/healthcare/nginx:latest
          docker push $ECR_REGISTRY/healthcare/nginx:latest

      - name: 🏗️ Build & Push Frontend
        run: |
          docker build -t $ECR_REGISTRY/healthcare/frontend:$IMAGE_TAG ./Healthcare_Frontend/smart_healthcare
          docker push $ECR_REGISTRY/healthcare/frontend:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/frontend:$IMAGE_TAG $ECR_REGISTRY/healthcare/frontend:latest
          docker push $ECR_REGISTRY/healthcare/frontend:latest

      - name: 🏗️ Build & Push Auth Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/auth-service:$IMAGE_TAG ./Healthcare_backend/auth-service
          docker push $ECR_REGISTRY/healthcare/auth-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/auth-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/auth-service:latest
          docker push $ECR_REGISTRY/healthcare/auth-service:latest

      - name: 🏗️ Build & Push User Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/user-service:$IMAGE_TAG ./Healthcare_backend/user_service
          docker push $ECR_REGISTRY/healthcare/user-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/user-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/user-service:latest
          docker push $ECR_REGISTRY/healthcare/user-service:latest

      - name: 🏗️ Build & Push Doctor Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/doctor-service:$IMAGE_TAG ./Healthcare_backend/Docter_service
          docker push $ECR_REGISTRY/healthcare/doctor-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/doctor-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/doctor-service:latest
          docker push $ECR_REGISTRY/healthcare/doctor-service:latest

      - name: 🏗️ Build & Push Appointment Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/appointment-service:$IMAGE_TAG ./Healthcare_backend/Appoinment_service
          docker push $ECR_REGISTRY/healthcare/appointment-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/appointment-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/appointment-service:latest
          docker push $ECR_REGISTRY/healthcare/appointment-service:latest

      - name: 🏗️ Build & Push Habit Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/habit-service:$IMAGE_TAG ./Healthcare_backend/HabitTracker_service
          docker push $ECR_REGISTRY/healthcare/habit-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/habit-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/habit-service:latest
          docker push $ECR_REGISTRY/healthcare/habit-service:latest

      - name: 🏗️ Build & Push AI Service
        run: |
          docker build -t $ECR_REGISTRY/healthcare/ai-service:$IMAGE_TAG ./Healthcare_backend/Ai_service
          docker push $ECR_REGISTRY/healthcare/ai-service:$IMAGE_TAG
          docker tag $ECR_REGISTRY/healthcare/ai-service:$IMAGE_TAG $ECR_REGISTRY/healthcare/ai-service:latest
          docker push $ECR_REGISTRY/healthcare/ai-service:latest

  # ──────────────────────────────────────────────────────────────────
  # JOB 2: Deploy to EC2
  # ──────────────────────────────────────────────────────────────────
  deploy:
    name: 🚀 Deploy to EC2
    runs-on: ubuntu-latest
    needs: build-and-push   # Only runs after images are pushed

    steps:
      - name: ⬇️ Checkout code
        uses: actions/checkout@v4

      - name: 🔐 Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ secrets.AWS_REGION }}

      - name: 🚢 Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          envs: AWS_REGION,ECR_REGISTRY,IMAGE_TAG
          script: |
            # Login to ECR from EC2
            aws ecr get-login-password --region $AWS_REGION | \
              docker login --username AWS --password-stdin $ECR_REGISTRY

            # Pull latest images
            docker pull $ECR_REGISTRY/healthcare/nginx:latest
            docker pull $ECR_REGISTRY/healthcare/frontend:latest
            docker pull $ECR_REGISTRY/healthcare/auth-service:latest
            docker pull $ECR_REGISTRY/healthcare/user-service:latest
            docker pull $ECR_REGISTRY/healthcare/doctor-service:latest
            docker pull $ECR_REGISTRY/healthcare/appointment-service:latest
            docker pull $ECR_REGISTRY/healthcare/habit-service:latest
            docker pull $ECR_REGISTRY/healthcare/ai-service:latest

            # Navigate to project and restart
            cd /home/ubuntu/healthcare
            docker compose down
            docker compose up -d

            # Clean up old images
            docker image prune -f

      - name: ✅ Verify Deployment
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ${{ secrets.EC2_USERNAME }}
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            sleep 10
            curl -f http://localhost/nginx-health || exit 1
            echo "✅ Deployment successful!"
```

---

## PHASE 4 — Production `docker-compose.yml` for EC2

This lives on the EC2 at `/home/ubuntu/healthcare/docker-compose.yml`:
*(Different from local — uses ECR images instead of building)*

```yaml
version: "3.9"

networks:
  healthcare_net:
    driver: bridge

services:

  nginx:
    image: ${ECR_REGISTRY}/healthcare/nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro   # SSL certs
    depends_on:
      - frontend
      - auth-service
      - user-service
      - doctor-service
      - appointment-service
      - habit-service
      - ai-service
    networks:
      - healthcare_net
    restart: unless-stopped

  frontend:
    image: ${ECR_REGISTRY}/healthcare/frontend:latest
    expose:
      - "3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_AUTH_API=https://yourdomain.com/api/auth
      - NEXT_PUBLIC_AI_API=https://yourdomain.com/api/ai
    networks:
      - healthcare_net
    restart: unless-stopped

  auth-service:
    image: ${ECR_REGISTRY}/healthcare/auth-service:latest
    expose:
      - "4001"
    env_file: .env.auth
    networks:
      - healthcare_net
    restart: unless-stopped

  user-service:
    image: ${ECR_REGISTRY}/healthcare/user-service:latest
    expose:
      - "4002"
    env_file: .env.user
    networks:
      - healthcare_net
    restart: unless-stopped

  doctor-service:
    image: ${ECR_REGISTRY}/healthcare/doctor-service:latest
    expose:
      - "4003"
    env_file: .env.doctor
    networks:
      - healthcare_net
    restart: unless-stopped

  appointment-service:
    image: ${ECR_REGISTRY}/healthcare/appointment-service:latest
    expose:
      - "4004"
    env_file: .env.appointment
    networks:
      - healthcare_net
    restart: unless-stopped

  habit-service:
    image: ${ECR_REGISTRY}/healthcare/habit-service:latest
    expose:
      - "4005"
    env_file: .env.habit
    networks:
      - healthcare_net
    restart: unless-stopped

  ai-service:
    image: ${ECR_REGISTRY}/healthcare/ai-service:latest
    expose:
      - "4006"
    env_file: .env.ai
    networks:
      - healthcare_net
    restart: unless-stopped

  # Shared infrastructure
  qdrant:
    image: qdrant/qdrant:latest
    expose:
      - "6333"
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - healthcare_net

  neo4j:
    image: neo4j:latest
    expose:
      - "7474"
      - "7687"
    volumes:
      - neo4j_data:/data
    environment:
      NEO4J_AUTH: neo4j/reform-william-center-vibrate-press-5829
    networks:
      - healthcare_net

  redis-stack:
    image: redis/redis-stack:latest
    expose:
      - "6379"
    volumes:
      - redis_data:/data
    networks:
      - healthcare_net

volumes:
  qdrant_data:
  neo4j_data:
  redis_data:
```

---

## PHASE 5 — SSL/HTTPS with Let's Encrypt (Free)

SSH into EC2 and run:

```bash
# Install Certbot
sudo apt install certbot -y

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certs will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

### Update `nginx/nginx.conf` for HTTPS

```nginx
events {
    worker_connections 1024;
}

http {
    # Upstreams (same as before)
    upstream frontend       { server frontend:3000; }
    upstream auth_service   { server auth-service:4001; }
    upstream user_service   { server user-service:4002; }
    upstream doctor_service { server doctor-service:4003; }
    upstream appointment_service { server appointment-service:4004; }
    upstream habit_service  { server habit-service:4005; }
    upstream ai_service     { server ai-service:4006; }

    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=ai_limit:10m rate=10r/s;

    # ── Redirect HTTP → HTTPS ────────────────────────────────────────
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # ── HTTPS Server ─────────────────────────────────────────────────
    server {
        listen 443 ssl;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         HIGH:!aNULL:!MD5;

        # Security Headers
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Auth
        location /api/auth/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://auth_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # User
        location /api/user/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://user_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Doctor
        location /api/doctor/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://doctor_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Appointment
        location /api/appointment/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://appointment_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # Habit
        location /api/habit/ {
            limit_req zone=api_limit burst=20 nodelay;
            proxy_pass http://habit_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }

        # AI (longer timeout)
        location /api/ai/ {
            limit_req zone=ai_limit burst=5 nodelay;
            proxy_pass http://ai_service/;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_read_timeout 120s;
            proxy_send_timeout 120s;
        }

        location /nginx-health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
```

---

## PHASE 6 — First-Time EC2 Setup Script

SSH into EC2 and run this **once** to set up the server:

```bash
# Create project directory
mkdir -p /home/ubuntu/healthcare
cd /home/ubuntu/healthcare

# Create .env files from your secrets (do this manually once)
nano .env.auth        # paste auth-service .env contents
nano .env.user        # paste user_service .env contents
nano .env.doctor      # paste Docter_service .env contents
nano .env.appointment # paste Appoinment_service .env contents
nano .env.habit       # paste HabitTracker_service .env contents
nano .env.ai          # paste Ai_service .env contents

# Copy your docker-compose.yml here (or create via nano)
nano docker-compose.yml

# Set ECR Registry environment variable
echo 'export ECR_REGISTRY="<account-id>.dkr.ecr.ap-south-1.amazonaws.com"' >> ~/.bashrc
source ~/.bashrc

# Give EC2 permission to pull from ECR
# (attach IAM role with ECRReadOnlyAccess to the EC2 instance instead of CLI keys)
```

---

## PHASE 7 — Update CORS in Your Services

Since your app is now on HTTPS, update CORS in each service:

**In `Ai_service/src/app.ts`** (and all other services):

```typescript
// Before
app.use(cors({
  origin: [process.env.FRONTEND_URL || "http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
}));

// After (production-ready)
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://yourdomain.com",
  "https://www.yourdomain.com",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
```

---

## Full CI/CD Flow Summary

```
You push to `main` branch on GitHub
            ↓
GitHub Actions triggers automatically
            ↓
Job 1: Builds 8 Docker images → Pushes to AWS ECR
            ↓
Job 2: SSHs into EC2 → Pulls new images → docker compose up -d
            ↓
Verifies /nginx-health endpoint responds
            ↓
✅ Live at https://yourdomain.com
```

---

## Rollback (If Something Breaks)

```bash
# On EC2 — rollback to previous image tag
docker pull $ECR_REGISTRY/healthcare/ai-service:<previous-git-sha>
# Update docker-compose.yml image tag and restart
docker compose up -d ai-service
```

---

## Checklist Summary

- `[ ]` **AWS**: Create EC2 (t3.medium, Ubuntu 22.04)
- `[ ]` **AWS**: Create 8 ECR repositories
- `[ ]` **AWS**: Create IAM user with ECR + EC2 access
- `[ ]` **GitHub**: Add all secrets (AWS keys, EC2 SSH key, app secrets)
- `[ ]` **Code**: Create `.github/workflows/deploy.yml`
- `[ ]` **Code**: Add `Dockerfile` to each service
- `[ ]` **EC2**: Install Docker + AWS CLI
- `[ ]` **EC2**: Create `/home/ubuntu/healthcare/` with `.env.*` files and `docker-compose.yml`
- `[ ]` **EC2**: Install Certbot and get SSL cert
- `[ ]` **Code**: Update `nginx.conf` with your domain and HTTPS
- `[ ]` **Code**: Update CORS in all services
- `[ ]` Push to `main` → watch GitHub Actions run!
