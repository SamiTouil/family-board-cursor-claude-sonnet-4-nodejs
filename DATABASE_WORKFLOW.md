# Database Workflow Guide

## 🛡️ Safe Database Operations (RECOMMENDED)

To prevent data loss during development, **always use the safe workflow commands** that automatically export, apply changes, and reseed your database.

### Quick Commands

```bash
# 🛡️ SAFE: Apply schema changes with automatic backup and reseed
npm run db:safe-push

# 📤 Export current database state
npm run db:export

# 🔄 Reset database with seed data
npm run db:reset
```

### Detailed Workflow

#### 1. Making Schema Changes (SAFE METHOD)
```bash
# Edit your schema.prisma file
# Then run the safe push command:
npm run db:safe-push
```

This command automatically:
1. 📤 Exports your current database state
2. 🔄 Applies schema changes with `prisma db push`
3. 🌱 Reseeds the database with your existing data

#### 2. Manual Database Operations
```bash
# Export current data before any risky operation
npm run db:export

# Apply your changes
cd backend && npx prisma db push

# Restore your data
npm run db:reset
```

## 🚨 Important Rules

### ✅ DO
- **Always use `npm run db:safe-push`** for schema changes
- Export data before any manual database operations
- Use the seed system to maintain consistent test data

### ❌ DON'T
- Never use `prisma db push` alone without reseeding
- Don't use `--force-reset` without backing up data first
- Don't manually delete database tables in development

## 🔧 Backend-Specific Commands

If you need to work directly in the backend directory:

```bash
cd backend

# Export current database state
npm run db:export

# Safe schema push with automatic reseed
npm run db:safe-push

# Force reset with seed (destructive - exports first!)
npm run db:reset-with-seed

# Generate Prisma client
npm run prisma:generate

# Open Prisma Studio
npm run prisma:studio
```

## 📊 Database Statistics

Check your current database state:

```bash
npm run db:export
# Shows: Users, Families, Family Members, Invites, Join Requests
```

## 🐳 Docker Integration

The database runs in Docker with persistent volumes. Data persists between container restarts unless you:
- Use `docker-compose down -v` (removes volumes)
- Use database reset commands
- Manually delete the Docker volume

## 🔄 Troubleshooting

### Data Disappeared?
1. Check if you used `prisma db push` without reseeding
2. Run `npm run db:reset` to restore from the last export
3. If no export exists, the seed will create demo data

### Schema Conflicts?
1. Export your data: `npm run db:export`
2. Fix your schema in `prisma/schema.prisma`
3. Apply safely: `npm run db:safe-push`

### Migration Issues?
We use `prisma db push` for development (not migrations). This is faster for iteration but requires the safe workflow to prevent data loss.

---

**Remember**: The key to avoiding data loss is using `npm run db:safe-push` instead of raw Prisma commands! 🛡️ 