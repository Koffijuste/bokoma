# Contribution Guide - Bokoma Frontend

Merci de votre intérêt pour contribuer à Bokoma Frontend! Ce guide vous aidera à démarrer.

## Code de Conduite

Soyez respectueux et bienveillant envers les autres contributeurs.

## Avant de Commencer

1. **Fork** le repository
2. **Clone** votre fork
3. **Créer une branche**: `git checkout -b feature/votre-feature`

## Processus de Contribution

### 1. Développement Local

```bash
npm install
npm run dev
```

### 2. Écrire du Code

#### Conventions de Code

**TypeScript:**
```typescript
// ✅ BON
interface User {
  id: string;
  name: string;
  email: string;
}

// ❌ MAUVAIS
interface User {
  id: any;
  name: any;
  email: any;
}
```

**Composants React:**
```typescript
// ✅ BON - Composant bien structuré
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onClick: () => void;
}

export function MyComponent({ title, onClick }: MyComponentProps) {
  return <Button onClick={onClick}>{title}</Button>;
}

// ❌ MAUVAIS - Pas de type, pas de commentaires
export function MyComponent(props) {
  return <button onClick={props.click}>{props.title}</button>;
}
```

**Nommage:**
```
Components: PascalCase (ProductCard.tsx)
Hooks: camelCase (useAuth.ts)
Utils: camelCase (helpers.ts)
Types: PascalCase (interface User)
Constants: UPPER_SNAKE_CASE (API_URL)
```

### 3. Commit Messages

Format:
```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: Nouvelle fonctionnalité
- `fix`: Bug fix
- `refactor`: Code refactor
- `style`: Changements de style
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

Exemples:
```
feat(auth): add forgot password page
fix(cart): correct item count display
refactor(api): improve error handling
docs: update README setup instructions
```

### 4. Tester Votre Code

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Tests (when available)
npm test
```

### 5. Push et Pull Request

```bash
git push origin feature/votre-feature
```

Sur GitHub, créer une **Pull Request** avec:
- **Titre**: Description claire de la PR
- **Description**: 
  - Quoi: Ce que vous avez changé
  - Pourquoi: La raison du changement
  - Tester: Comment tester votre code
- **Screenshots**: Si c'est une UI change
- **Checklist**: Confirmer les points

Template de PR:

```markdown
## Quoi
Description des changements

## Pourquoi
Raison/contexte du changement

## Comment Tester
Étapes pour reproduire/tester

## Screenshots (si applicable)
[Ajouter des screenshots]

## Checklist
- [ ] J'ai testé mes changements localement
- [ ] Le code suit les conventions du projet
- [ ] TypeScript compile sans erreurs
- [ ] Les linters passent
- [ ] Documentation mise à jour si nécessaire
```

## Directives de Contribution

### Composants

```typescript
// 📁 components/shared/example.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import type { FC } from 'react';

interface ExampleProps {
  title: string;
  description?: string;
  isLoading?: boolean;
}

/**
 * Example component with description
 * @param title - Component title
 * @param description - Optional description
 * @param isLoading - Loading state
 */
export const Example: FC<ExampleProps> = ({
  title,
  description,
  isLoading = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="text-sm">{description}</p>}
    </motion.div>
  );
};

Example.displayName = 'Example';
```

### Pages

```typescript
// 📄 app/(public)/example/page.tsx

'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ExamplePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-4xl font-bold">Page Title</h1>
    </motion.div>
  );
}
```

### Hooks

```typescript
// 🪝 hooks/useExample.ts

import { useCallback, useState } from 'react';

interface UseExampleReturn {
  data: string | null;
  isLoading: boolean;
  error: Error | null;
  fetch: () => Promise<void>;
}

/**
 * Hook description
 * @returns Hook state and methods
 */
export function useExample(): UseExampleReturn {
  const [data, setData] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    try {
      // Your logic
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetch };
}
```

## Ajouter des Nouvelles Dépendances

Avant d'ajouter une dépendance:
1. Vérifier si c'est vraiment nécessaire
2. Considérer les alternatives
3. Vérifier la taille et la maintenance

```bash
npm install package-name

# Pour les dev-dependencies
npm install --save-dev package-name
```

Mettre à jour le README avec la nouvelle dépendance si applicable.

## Issues et Discussions

### Signaler un Bug

Fournir:
- Description du bug
- Étapes pour le reproduire
- Comportement attendu vs actuel
- Screenshots si applicable
- Environnement (OS, Node.js version, etc.)

### Proposer une Feature

Fournir:
- Description claire de la fonctionnalité
- Cas d'usage
- Implémentation proposée (si possible)
- Alternatives considérées

## Questions?

- Consulter la documentation: [SETUP.md](SETUP.md)
- Lire le [README](README.md)
- Ouvrir une [Discussion](https://github.com/yourrepo/discussions)

## Licences

En contribuant, vous acceptez que vos contributions soient sous la license MIT du projet.

---

Merci pour vos contributions! 🙏
