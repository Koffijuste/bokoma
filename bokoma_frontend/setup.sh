#!/bin/bash

# 🚀 Bokoma Frontend Setup Script
# Exécutez ce script pour initialiser rapidement le projet

set -e

echo "🎉 Bienvenue à Bokoma Frontend Setup!"
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez installer Node.js 18+ d'abord."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Navigate to directory
cd "$(dirname "$0")"

# 1. Clean install
echo ""
echo "📦 Nettoyage des dépendances précédentes..."
rm -rf node_modules package-lock.json

# 2. Install dependencies
echo ""
echo "📥 Installation des dépendances..."
npm install

# 3. Copy environment file
if [ ! -f .env.local ]; then
    echo ""
    echo "🔧 Configuration de l'environnement..."
    cp .env.example .env.local
    echo "✅ Fichier .env.local créé"
    echo "   Veuillez éditer .env.local avec votre configuration"
else
    echo "✅ Fichier .env.local existe déjà"
fi

# 4. Type checking
echo ""
echo "🔍 Vérification TypeScript..."
npm run type-check || echo "⚠️  Quelques erreurs TypeScript peuvent être présentes"

# 5. Summary
echo ""
echo "=================================="
echo "✅ Setup Complété!"
echo "=================================="
echo ""
echo "Prochaines étapes:"
echo "1. Éditer .env.local avec vos URLs"
echo "2. Démarrer le serveur de développement:"
echo "   npm run dev"
echo "3. Ouvrir http://localhost:3000"
echo ""
echo "Documentation:"
echo "  - QUICKSTART.md     - Démarrage rapide"
echo "  - README.md         - Vue complète"
echo "  - SETUP.md          - Configuration détaillée"
echo "  - COMMANDS.md       - Commandes utiles"
echo ""
echo "Bon développement! 🚀"
