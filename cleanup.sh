#!/bin/bash
# cleanup.sh - Remove unnecessary files and bloat

echo "🧹 Starting comprehensive cleanup..."
echo ""

# Remove duplicate/backup env files
echo "📄 Removing duplicate environment files..."
rm -f ".env copy.local" ".env copy.production" .env.sheets.example

# Remove large unnecessary files
echo "📦 Removing large unnecessary files..."
rm -f nvim-linux64.tar.gz

# Remove MongoDB data folder (should be in .gitignore)
echo "🗄️  Removing MongoDB data folder..."
rm -rf data/

# Remove backup/old config files
echo "⚙️  Removing backup config files..."
rm -f next.config.ts.save middleware-init.ts .npmrc

# Remove pnpm lock (using npm)
echo "🔒 Removing pnpm lockfile..."
rm -f pnpm-lock.yaml

# Remove unused default Next.js icons
echo "🎨 Removing unused SVG icons..."
rm -f public/file.svg public/globe.svg public/next.svg public/vercel.svg public/window.svg

# Optional: Remove documentation (interactive)
echo ""
read -p "Remove duplicate documentation files? (y/n): " remove_docs
if [ "$remove_docs" = "y" ]; then
    echo "📚 Removing duplicate documentation..."
    rm -f QUICK_START.md LOCAL_DEVELOPMENT_GUIDE.md
fi

# Optional: Remove Docker files if not using
echo ""
read -p "Are you using Docker for deployment? (y/n): " use_docker
if [ "$use_docker" != "y" ]; then
    echo "🐳 Removing Docker files..."
    rm -f Dockerfile docker-compose.yaml docker-compose.dev.yml
fi

# Optional: Remove local setup script
echo ""
read -p "Remove setup-local.sh script? (y/n): " remove_setup
if [ "$remove_setup" = "y" ]; then
    echo "🔧 Removing setup script..."
    rm -f setup-local.sh
fi

# Remove build artifacts (optional)
echo ""
read -p "Remove .next build folder? (y/n): " remove_build
if [ "$remove_build" = "y" ]; then
    echo "🏗️  Removing build artifacts..."
    rm -rf .next
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Summary:"
echo "   ✓ Removed duplicate/backup files"
echo "   ✓ Removed large unnecessary files"
echo "   ✓ Removed MongoDB data folder"
echo "   ✓ Cleaned up config files"
echo ""
echo "💡 Next steps:"
echo "   - Run 'npm run build' to rebuild if needed"
echo "   - Commit changes: git add . && git commit -m 'Clean up redundant files'"
echo ""