# 📦 Bokoma Frontend - Commandes Utiles

## Git & Version Control

### Initialiser Git (première fois)
```bash
cd Bokoma_Frontend
git init
git add .
git commit -m "init: Initial project setup"
git remote add origin https://github.com/yourusername/bokoma-frontend.git
git branch -M main
git push -u origin main
```

### Workflow Standard
```bash
# 1. Créer une branche feature
git checkout -b feature/nom-feature

# 2. Faire les modifications

# 3. Commiter les changements
git add .
git commit -m "feat(scope): description"

# 4. Push vers remote
git push origin feature/nom-feature

# 5. Créer une Pull Request sur GitHub

# 6. Après merge, retourner à main
git checkout main
git pull origin main
```

### Commits Courants
```bash
# Feature
git commit -m "feat(auth): add forgot password page"

# Bug fix
git commit -m "fix(cart): correct item count"

# Refactoring
git commit -m "refactor(api): improve error handling"

# Documentation
git commit -m "docs: update README setup guide"

# Style (formatting, missing semicolons)
git commit -m "style: fix indentation"

# Tests
git commit -m "test(products): add product listing tests"

# Chore (maintenance, dependencies)
git commit -m "chore(deps): update nextjs to 15.1.0"
```

---

## npm Commands

### Installation & Setup
```bash
# Install all dependencies
npm install

# Install specific package
npm install package-name

# Install dev dependency
npm install --save-dev package-name

# Update all packages
npm update

# Check outdated packages
npm outdated

# Check for vulnerabilities
npm audit
npm audit fix
```

### Development
```bash
# Start dev server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Fix lint issues
npm run lint --fix

# Both type-check and lint
npm run type-check && npm run lint
```

### Build & Production
```bash
# Build for production
npm run build

# Start production server
npm start

# Analyze build
npm run build -- --analyze
```

### Cleaning
```bash
# Clear next cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Full clean
npm cache clean --force
```

---

## Code Quality Commands

```bash
# Type-check entire project
npx tsc --noEmit

# ESLint - check files
npx eslint app/ components/ hooks/ services/ store/ types/ utils/

# ESLint - fix issues
npx eslint app/ components/ --fix

# Prettier - check formatting
npx prettier --check .

# Prettier - format code
npx prettier --write .
```

---

## Docker Commands (Production)

```bash
# Build Docker image
docker build -t bokoma-frontend:latest .

# Run container locally
docker run -p 3000:3000 bokoma-frontend:latest

# Build and run with docker-compose
docker-compose up --build

# Stop container
docker stop bokoma-frontend

# Remove image
docker rmi bokoma-frontend:latest
```

---

## Vercel Deployment

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link project to Vercel
vercel link

# Deploy to production
vercel deploy --prod

# View deployments
vercel ls

# Show environment variables
vercel env list

# Add environment variable
vercel env add NEXT_PUBLIC_API_URL
vercel env add NEXT_PUBLIC_STRIPE_PUBLIC_KEY

# Deploy with specific environment
vercel deploy --prod --env .env.production
```

---

## Testing Commands (When Implemented)

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- auth.test.ts

# Test with coverage
npm test -- --coverage

# E2E tests
npx playwright test

# E2E tests - headed mode (see browser)
npx playwright test --headed
```

---

## Performance & Analysis

```bash
# Analyze bundle size
npx next-bundle-analyzer

# Performance audit
npx lighthouse http://localhost:3000

# Check CWV (Core Web Vitals)
npm run type-check && npm run lint

# Generate build report
npm run build -- --analyze-size
```

---

## Database Commands

```bash
# Backup local database (if using MongoDB)
mongodump --db bokoma --out ./backup

# Restore database
mongorestore --db bokoma ./backup/bokoma

# MongoDB shell
mongosh

# MongoDB - list all databases
show dbs

# MongoDB - use database
use bokoma

# MongoDB - show collections
show collections
```

---

## Useful One-liners

```bash
# Check all process on port 3000
lsof -i :3000

# Kill process on port 3000
kill -9 $(lsof -t -i:3000)

# Count lines of code
find . -name "*.ts" -o -name "*.tsx" | xargs wc -l

# Find files by name pattern
find . -name "*component*" -type f

# Search for TODO comments
grep -r "TODO" app/ components/ services/ --include="*.ts" --include="*.tsx"

# Generate tree structure
tree -L 3 -I 'node_modules|.next'
```

---

## Troubleshooting Commands

```bash
# Clear all npm cache
npm cache clean --force

# Verify npm installation
npm doctor

# Check Node version
node --version

# Check npm version
npm --version

# Install compatible Node versions
nvm install 18.17

# Use specific Node version
nvm use 18.17

# List installed Node versions
nvm list

# Reinstall all node_modules
rm -rf node_modules package-lock.json
npm install

# Check for outdated packages
npm outdated

# Security audit
npm audit
npm audit fix --force
```

---

## Git Advanced Commands

```bash
# See commit history
git log --oneline

# See changes in file
git diff filename

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes)
git reset --hard HEAD~1

# Stash changes temporarily
git stash

# Apply stashed changes
git stash pop

# Cherry-pick commit
git cherry-pick <commit-hash>

# Rebase branch
git rebase main

# Merge with message
git merge feature/my-feature -m "Merge feature-my-feature into main"

# Create tag
git tag v1.0.0
git push origin v1.0.0

# View remote branches
git branch -a

# Delete local branch
git branch -d feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature
```

---

## Environment Variables Management

```bash
# Copy example env file
cp .env.example .env.local

# Check if .env.local exists
ls -la .env.local

# Add to .gitignore (already done)
echo ".env.local" >> .gitignore

# Test environment variables in code
console.log(process.env.NEXT_PUBLIC_API_URL)

# Verify all required env vars are set
grep "NEXT_PUBLIC" .env.local

# Use different env files for different environments
# .env.local - local development
# .env.production - production
# .env.test - testing
```

---

## Package Management

```bash
# List installed packages
npm list

# List installed packages (short version)
npm list --depth=0

# Show package info
npm view package-name

# Show specific version
npm view next@15.1.0

# Install specific version
npm install next@15.1.0

# Uninstall package
npm uninstall package-name

# Update single package
npm update package-name
```

---

## Useful VS Code Extensions Commands

```bash
# Install VS Code extension
code --install-extension extension-id

# Useful extensions for this project:
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension formulahendry.auto-rename-tag
code --install-extension eamodio.gitlens
```

---

## System Commands

```bash
# Check disk space
df -h

# Check RAM usage
free -h

# List running processes
ps aux | grep node

# Check open files
lsof | grep node

# Monitor system resources
htop

# Kill all node processes
killall node
```

---

## Quick Reference

### Terminal Shortcuts
- `Ctrl + C` - Stop running process
- `Ctrl + L` - Clear terminal
- `Up Arrow` - Previous command
- `Ctrl + R` - Search command history
- `Tab` - Auto-complete

### Git Shortcuts
- `git st` - alias for `git status`
- `git co` - alias for `git checkout`
- `git br` - alias for `git branch`

### npm Shortcuts
- `npm i` - alias for `npm install`
- `npm test` - runs test script
- `npm start` - runs start script

---

## Checkliste Avant Push

```bash
# 1. Type-check
npm run type-check

# 2. Lint
npm run lint

# 3. Build locally
npm run build

# 4. Test locally (if tests exist)
npm test

# 5. Check git status
git status

# 6. Add changes
git add .

# 7. Commit with message
git commit -m "feat(scope): description"

# 8. Push
git push origin feature/branch-name
```

---

**Tip**: Mettre en favoris cette page pour un accès rapide! 🚀
