# PropertyMaster Deployment Guide

This guide covers deploying PropertyMaster to various cloud providers.

## Quick Deploy Options

### Option 1: Railway (Easiest - 5 minutes)

**Perfect for**: Quick deployment, proof-of-concept, low-traffic production

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login to Railway
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add --database postgres

# 5. Add Redis
railway add --database redis

# 6. Deploy
railway up
```

**Configuration:**
- Railway automatically reads `railway.json`
- Set environment variables in Railway dashboard
- Database URLs are auto-injected

**Cost:** ~$5-20/month (Starter plan)

---

### Option 2: Render (Best Balance - 10 minutes)

**Perfect for**: Production apps, automatic scaling, managed infrastructure

```bash
# 1. Install Render CLI
brew install render  # macOS
# or download from https://render.com/docs/cli

# 2. Login
render login

# 3. Deploy using blueprint
render blueprint launch
```

**Configuration:**
- Render reads `render.yaml` for full stack
- Includes PostgreSQL, Redis, and web service
- Auto-SSL certificates
- Auto-scaling available

**Cost:** ~$25-50/month (Starter databases + web service)

---

### Option 3: Vercel (Frontend) + Railway (Backend)

**Perfect for**: Best frontend performance, global CDN

**Deploy Frontend:**
```bash
cd packages/frontend-admin
vercel
# Follow prompts, connect to GitHub
```

**Deploy Tenant Portal:**
```bash
cd packages/frontend-tenant
vercel
# Deploy as separate project
```

**Deploy Backend:**
```bash
# Use Railway as shown in Option 1
railway up
```

**Update `vercel.json` with your Railway backend URL**

**Cost:** ~$20-30/month (Vercel Pro + Railway)

---

### Option 4: AWS (Enterprise - Full Control)

**Perfect for**: Large-scale production, full control, compliance requirements

**Prerequisites:**
- AWS Account
- Terraform installed
- AWS CLI configured

**Deploy:**
```bash
cd terraform

# Initialize Terraform
terraform init

# Create infrastructure plan
terraform plan \
  -var="acm_certificate_arn=arn:aws:acm:..." \
  -var="db_password=SECURE_PASSWORD"

# Apply infrastructure
terraform apply
```

**Includes:**
- VPC with public/private subnets
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis
- ECS Fargate cluster
- Application Load Balancer
- Auto-scaling
- CloudWatch monitoring

**Cost:** ~$100-300/month (depends on traffic)

---

## Environment Variables

Required environment variables for all deployments:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis
REDIS_URL="redis://host:6379"

# JWT
JWT_SECRET="your-super-secret-jwt-key-change-me"
JWT_EXPIRES_IN="7d"

# Stripe
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT=587
SMTP_USER="apikey"
SMTP_PASSWORD="SG.xxx"
SMTP_FROM="noreply@yourcompany.com"

# App
NODE_ENV="production"
API_PORT=3001
FRONTEND_ADMIN_URL="https://admin.yourcompany.com"
FRONTEND_TENANT_URL="https://tenant.yourcompany.com"

# CORS
ALLOWED_ORIGINS="https://admin.yourcompany.com,https://tenant.yourcompany.com"
```

---

## Database Migrations

**After deployment, run migrations:**

```bash
# Option 1: Using Railway CLI
railway run pnpm db:migrate

# Option 2: Using Render CLI
render run pnpm db:migrate

# Option 3: Manually via SSH
ssh into-container
cd /app/packages/database
pnpm prisma migrate deploy
```

**Seed demo data (optional):**
```bash
railway run "cd packages/database && pnpm seed"
```

---

## Custom Domain Setup

### Railway:
1. Go to Settings → Domains
2. Add custom domain
3. Update DNS CNAME record

### Render:
1. Go to Settings → Custom Domains
2. Add domain
3. Update DNS records
4. Auto-SSL enabled

### Vercel:
1. Go to Settings → Domains
2. Add domain
3. Follow DNS instructions
4. SSL automatic

### AWS:
1. Create ACM certificate
2. Validate domain
3. Update Terraform variable
4. Apply changes

---

## Monitoring & Logs

### Railway:
- Built-in logs: `railway logs`
- Metrics dashboard in web UI

### Render:
- Logs in dashboard
- Metrics & auto-restart
- Health checks configured

### AWS:
- CloudWatch Logs
- CloudWatch Metrics
- X-Ray tracing (optional)
- CloudWatch Alarms

---

## Backup Strategy

### Database Backups:

**Railway/Render:**
- Automatic daily backups
- 7-day retention
- Point-in-time recovery

**AWS RDS:**
- Automated daily backups
- Configurable retention (7-35 days)
- Manual snapshots
- Cross-region replication (optional)

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## Scaling

### Vertical Scaling (More Resources):
- **Railway**: Upgrade plan in dashboard
- **Render**: Upgrade instance type
- **AWS**: Modify `instance_class` in Terraform

### Horizontal Scaling (More Instances):
- **Railway**: Pro plan, adjust replicas
- **Render**: Enable auto-scaling
- **AWS**: Modify ECS task count

---

## CI/CD Integration

**GitHub Actions (included in `.github/workflows/ci.yml`):**

Automatically:
- ✅ Runs tests
- ✅ Checks linting
- ✅ Builds application
- ✅ Can deploy on merge to main

**Add deployment step:**
```yaml
- name: Deploy to Railway
  run: railway up
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

---

## Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ chars)
- [ ] Enable HTTPS only
- [ ] Configure CORS properly
- [ ] Enable rate limiting
- [ ] Set up monitoring alerts
- [ ] Enable database encryption at rest
- [ ] Use environment variables (never commit secrets)
- [ ] Enable 2FA for all admin accounts
- [ ] Review and configure firewall rules

---

## Support & Troubleshooting

### Common Issues:

**Database connection failed:**
- Check `DATABASE_URL` format
- Verify database is running
- Check firewall rules

**Prisma errors:**
- Regenerate client: `pnpm db:generate`
- Run migrations: `pnpm db:migrate`

**Port conflicts:**
- Update `API_PORT` environment variable
- Check if port is already in use

**CORS errors:**
- Update `ALLOWED_ORIGINS`
- Check frontend URL configuration

---

## Cost Optimization

### Development:
- Use Railway/Render Starter plans
- Single database instance
- Shared Redis

### Production (Small):
- Render with managed databases
- ~$30-50/month

### Production (Medium):
- AWS with ECS Fargate
- Multi-AZ RDS
- ~$150-300/month

### Production (Enterprise):
- AWS with reserved instances
- Multi-region setup
- CDN (CloudFront)
- ~$500-2000/month

---

**Recommended Path:**
1. **Start**: Railway (development)
2. **Grow**: Render (small production)
3. **Scale**: AWS (enterprise)

Your application is designed to run on any of these platforms without code changes!
