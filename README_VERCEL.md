# 🚀 Guide de Déploiement sur Vercel — Jengu_Tech Dashboard

Ce document fournit les instructions pas à pas pour préparer et déployer avec succès le tableau de bord de répartition (dispatcher) VTC **Jengu_Tech Dashbord** sur la plateforme cloud **Vercel**.

---

## 🛠️ Configuration Préparée pour Vercel

Le projet a été optimisé pour un déploiement fluide sur Vercel grâce aux éléments suivants :
1. **`vercel.json`** : Ajouté à la racine pour gérer les routes d'une application monopage (SPA) de manière propre. Toutes les requêtes de navigation web non-statiques sont automatiquement redirigées vers `index.html` pour éviter les erreurs `404 Not Found` lors du rechargement de la page.
2. **Gestion Optimisée des Variables d'Environnement** : Le code récupère de manière fluide les variables préfixées par `VITE_` pour connecter l'interface à votre base de données Supabase, tant en developpement qu'en production.

---

## 📋 Prérequis

Avant de déployer, vous aurez besoin de :
1. Un compte [Vercel](https://vercel.com/) (gratuit ou pro).
2. Vos identifiants de connexion API Supabase (disponibles dans la console Supabase, sous *Project Settings > API*) :
   - **`VITE_SUPABASE_URL`** : L'URL de votre projet Supabase.
   - **`VITE_SUPABASE_ANON_KEY`** : La clé anonyme publique pour clients.

---

## 🚀 Étape de Déploiement : Pas-à-Pas

### Option A : Déploiement via GitHub / Git (Recommandé)

1. **Poussez votre code** sur un dépôt Git privé ou public (GitHub, GitLab ou Bitbucket).
2. Connectez-vous sur [Vercel](https://vercel.com/).
3. Cliquez sur **"Add New"** > **"Project"**.
4. Importez votre dépôt fraîchement créé.
5. Dans l'étape de configuration du projet (**Configure Project**) :
   - **Framework Preset** : Sélectionnez **Vite** (détecté automatiquement).
   - **Root Directory** : `./` (la racine).
   - **Build and Output Settings** : Conservez les valeurs par défaut :
     * *Build Command* : `npm run build` (ou `vite build`)
     * *Output Directory* : `dist`
     * *Install Command* : `npm install`
6. Déroulez l'onglet **Environment Variables** (voir section ci-dessous) pour y insérer vos clés Supabase.
7. Cliquez sur **Deploy**. 🎉

---

### Option B : Déploiement via la CLI Vercel

Si vous préférez déployer directement depuis votre terminal local :
1. Installez Vercel globalement :
   ```bash
   npm install -g vercel
   ```
2. Connectez-vous à votre compte :
   ```bash
   vercel login
   ```
3. Lancez le déploiement interactif à la racine du projet :
   ```bash
   vercel
   ```
4. Configurez vos variables d'environnement directement sur le portail en ligne ou suivez les instructions de la CLI.

---

## 🔐 Configuration des Variables d'Environnement

Pour que la base de données en temps réel Jengu_Tech fonctionne sur l'application déployée, vous **devez** renseigner les variables d'environnement suivantes dans l'interface de configuration de Vercel :

| Nom de la clé | Description | Exemple de valeur |
| :--- | :--- | :--- |
| **`VITE_SUPABASE_URL`** | URL de l'instance de base de données Supabase | `https://yourprojectid.supabase.co` |
| **`VITE_SUPABASE_ANON_KEY`** | Clé anonyme cliente de votre projet Supabase | `eyJhbGciOiJIUzI1NiIsInR5cCI6I...` |

*(Note: Ces variables sont automatiquement injectées dans le code client au moment de la compilation par Vite).*

---

## 🗺️ Fonctionnalités Validées après Déploiement

Une fois déployé :
* **Carte interactive Leaflet** : Se charge de manière asynchrone et fluide.
* **Navigation fluide SPA** : Pas de crash ou de rechargement complet de la page grâce au rewrite configuré dans `vercel.json`.
* **Securité Sandbox** : En cas d'oubli ou d'indisponibilité temporaire des clés Supabase, l'application basculera gracieusement sur un **mode de données d'entraînement local (Sandbox)** sans faire de crash visuel à l'écran pour l'utilisateur.
