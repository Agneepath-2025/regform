#!/bin/bash
# cleanup.sh - Remove unnecessary files

echo "🧹 Starting cleanup..."

# Remove duplicate env files
rm -f ".env copy.local" ".env copy.production"

# Remove large unnecessary files
rm -f nvim-linux64.tar.gz

# Remove MongoDB data (should be in .gitignore anyway)
rm -rf data/

# Remove duplicate docs
rm -f QUICK_START.md LOCAL_DEVELOPMENT_GUIDE.md .env.sheets.example

# Remove backup/old config files
rm -f next.config.ts.save middleware-init.ts

# Remove pnpm lock (using npm)
rm -f pnpm-lock.yaml

# Remove unused default icons
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg

# Remove build artifacts
rm -rf .next

echo "✅ Cleanup complete!"
echo "💡 Run 'npm run build' to rebuild"