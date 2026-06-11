# MoveBreak

Application anti-sédentarité pour les employés de bureau. Rappels intelligents, exercices guidés, gamification, et (en V2) tableau d'équipe avec code d'accès.

## Démarrage rapide

Double-cliquer sur `movebreak.html`. C'est tout. Le fichier est auto-suffisant : React, Tailwind et Babel sont chargés depuis leur CDN au runtime.

> Pour le développement local, ouvrir avec un serveur HTTP léger (recommandé pour éviter les soucis de cache) :
>
> ```bash
> npx serve .
> # ou
> python -m http.server 8000
> ```

## Reconstruire après modification du source

Le fichier `movebreak.html` est généré. Si vous modifiez `src/app.jsx` ou `src/template.html`, regénérez-le :

```bash
node build.js
```

Aucune dépendance npm requise.

## Structure

| Fichier | Rôle |
|---|---|
| `movebreak.html` | Application livrée, ouvrable en double-clic |
| `src/app.jsx` | Code React/JSX complet (composants + état) |
| `src/template.html` | Shell HTML : CSS, fond cream + vagues SVG statiques |
| `build.js` | Concatène template + jsx → `movebreak.html` |
| `design/` | Planches d'identité visuelle (proposition) |

## Stack

- React 18 (CDN)
- Tailwind CSS (CDN)
- Babel-standalone (transpile JSX au runtime)
- `localStorage` pour la persistance

## État du projet

Prototype V1 complet : 7 écrans + profil local (dashboard, rappel, exercice, bibliothèque, paramètres, stats, tableau d'équipe en teaser). Prochaine étape : re-plateformage production (backend, comptes, sync, stores).

## Licence

**Tous droits réservés** © 2026 ThePankar. Le code est visible à des fins de consultation uniquement — voir [`LICENSE`](LICENSE). Toute réutilisation, copie ou distribution nécessite une autorisation écrite préalable.
