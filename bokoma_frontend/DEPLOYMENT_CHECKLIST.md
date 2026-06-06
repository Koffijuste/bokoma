# 🚀 Bokoma Store - Deployment Checklist

## Pre-Deployment

### Code Quality
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No ESLint errors: `npm run lint`
- [ ] All tests pass: `npm test`
- [ ] No console errors in development
- [ ] No unused variables or imports
- [ ] Security vulnerabilities checked: `npm audit`

### Frontend Checks
- [ ] Environment variables configured (.env.local)
- [ ] API endpoints pointing to correct backend
- [ ] Images optimized (Cloudinary configured)
- [ ] Authentication flow tested (login/register/logout)
- [ ] Cart functionality working
- [ ] Responsive design tested on mobile/tablet/desktop
- [ ] Dark mode works properly
- [ ] All links working
- [ ] 404 page exists and works

### Performance
- [ ] Lighthouse score > 80
- [ ] Core Web Vitals optimized
- [ ] Images lazy loaded where appropriate
- [ ] CSS/JS minified
- [ ] No memory leaks detected

### Backend Checks
- [ ] Database migrations run
- [ ] API endpoints tested with Postman
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] CORS properly configured for frontend domain
- [ ] Security headers set (Helmet.js)
- [ ] Stripe/Cloudinary credentials secure

## Deployment - Vercel (Frontend)

### Pre-Deploy
- [ ] Code committed and pushed to main branch
- [ ] All PRs reviewed and merged
- [ ] Environment variables added to Vercel dashboard

### Deploy Steps
```bash
# Link project
vercel link

# Set production environment variables
vercel env add NEXT_PUBLIC_API_URL

# Deploy
vercel deploy --prod

# Verify deployment
# Visit https://your-domain.vercel.app
```

### Post-Deploy
- [ ] Check homepage loads
- [ ] Check API connectivity (Network tab)
- [ ] Login/Register works
- [ ] Products load correctly
- [ ] Images display correctly
- [ ] Responsive design intact
- [ ] Dark mode works
- [ ] No console errors

## Deployment - AWS/Docker (Backend)

### Pre-Deploy
- [ ] Dockerfile created and tested locally
- [ ] docker-compose.yml configured
- [ ] Environment variables secured in AWS Secrets Manager
- [ ] Database backups created

### Deploy Steps
```bash
# Build Docker image
docker build -t bokoma-backend:latest .

# Push to AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin [YOUR_ECR_URL]
docker tag bokoma-backend:latest [YOUR_ECR_URL]/bokoma-backend:latest
docker push [YOUR_ECR_URL]/bokoma-backend:latest

# Deploy to ECS/App Runner
# Configure in AWS Console or using CLI
```

### Post-Deploy
- [ ] Health endpoint responds (GET /api/v1/health)
- [ ] Database connection established
- [ ] API endpoints accessible
- [ ] Stripe/Cloudinary integration working
- [ ] Email service functional
- [ ] Logs accessible
- [ ] Monitoring set up

## Database Deployment

### MongoDB Atlas
- [ ] Cluster created
- [ ] Backups enabled
- [ ] Connection string added to backend
- [ ] Database replicated across regions
- [ ] Performance monitoring enabled

```bash
# Create backup before deployment
mongodump --uri="mongodb+srv://..." --out=./backup
```

## Post-Deployment

### Monitoring Setup
- [ ] Error tracking (Sentry) configured
- [ ] Application monitoring active
- [ ] Log aggregation (CloudWatch/Datadog) running
- [ ] Alerts configured for critical errors
- [ ] Uptime monitoring active

### DNS & SSL
- [ ] Domain pointing to Vercel nameservers
- [ ] SSL certificate valid and auto-renewing
- [ ] www vs non-www redirect configured
- [ ] Email records (SPF, DKIM) configured

### Documentation
- [ ] Update README with production URLs
- [ ] API documentation up to date
- [ ] Deployment process documented
- [ ] Team notified of deployment
- [ ] Release notes written

### First Day Monitoring
- [ ] Check error rates (should be near 0%)
- [ ] Monitor API response times
- [ ] Check database performance
- [ ] Monitor server resources
- [ ] Review user feedback
- [ ] Check payment processing (if live)

## Rollback Plan

If issues occur:

```bash
# Frontend (Vercel)
vercel deploy --prod --yes  # Redeploy previous commit

# Backend (Docker)
docker pull [YOUR_ECR_URL]/bokoma-backend:previous-tag
# Redeploy using previous image
```

## Post-Deployment Testing

### User Journeys
- [ ] New user can register
- [ ] User can browse products
- [ ] User can search for products
- [ ] User can add products to cart
- [ ] User can proceed to checkout
- [ ] Payment works (test mode)
- [ ] Order confirmation email received
- [ ] Admin can view orders
- [ ] Admin can manage products

### Edge Cases
- [ ] Out of stock products handled
- [ ] Expired coupons rejected
- [ ] Invalid payment methods rejected
- [ ] Network errors handled gracefully
- [ ] Session timeout handled
- [ ] Admin access controlled

## Scaling Checklist

For production load:
- [ ] Database indexed appropriately
- [ ] Caching implemented (Redis if needed)
- [ ] CDN configured for static assets
- [ ] Load balancer configured (if needed)
- [ ] Auto-scaling enabled
- [ ] Database connection pooling configured

## Security Checklist

- [ ] SSL/TLS enforced (HTTPS only)
- [ ] CORS configured correctly
- [ ] CSRF protection enabled
- [ ] XSS protection in place
- [ ] SQL injection prevention
- [ ] Rate limiting configured
- [ ] Input validation on all endpoints
- [ ] Secrets not in version control
- [ ] API keys rotated regularly
- [ ] Access logs reviewed

---

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Version**: ___________  
**Notes**: 

