#!/bin/bash

echo "Starting CyberTask Backend..."

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Seed database if needed (optional, comment out in production)
# echo "Seeding database..."
# npx prisma db seed

# Start the application
echo "Starting server..."
npm run start