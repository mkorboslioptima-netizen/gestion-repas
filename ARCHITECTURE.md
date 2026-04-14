# Architecture Technique — Système Cantine SEBN

## Vue d'ensemble

Système automatisé de gestion des repas basé sur des lecteurs biométriques **Morpho Sigma Lite+**.
Le système identifie l'employé via TCP, vérifie son éligibilité, enregistre le repas et imprime un ticket thermique.

---

## Stack Technique

| Couche | Technologie | Version | Rôle |
|--------|-------------|---------|------|
| **Backend API** | ASP.NET Core Web API | 8.0 LTS | Endpoints REST, logique métier, auth |
| **TCP Service** | C# `BackgroundService` | .NET 8 | Listener Morpho, impression tickets |
| **ORM** | Entity Framework Core | 8.x | Accès SQL Server, migrations |
| **Real-time** | Server-Sent Events (SSE) | intégré ASP.NET | Push dashboard → clients web |
| **Auth** | ASP.NET Core Identity + JWT | intégré | Gestion utilisateurs et rôles |
| **Export Excel** | ClosedXML | 0.102.x | Génération fichiers Excel streamés |
| **Impression** | `System.Net.Sockets` | intégré | Envoi ESC/POS vers imprimantes réseau |
| **Frontend** | React + TypeScript | 18 / 5.x | SPA multi-accès |
| **Build frontend** | Vite | 5.x | Bundler, HMR dev |
| **UI Components** | Ant Design (antd) | 5.x | Tables, formulaires, layout admin |
| **Graphes** | Recharts | 2.x | Dashboard temps réel |
| **HTTP Client** | Axios + TanStack Query | — | Appels API + cache côté React |
| **Base de données** | SQL Server Express | 2022 | Stockage principal (gratuit, 10 GB max) |
| **Hébergement** | IIS 10 + Windows Service | — | Déploiement natif Windows |

---

## Architecture Globale

```
┌──────────────────────────────────────────────────────────────────┐
│                        Windows Server (IIS)                       │
│                                                                  │
│  ┌───────────────────────┐    ┌──────────────────────────────┐   │
│  │    Windows Service     │    │    ASP.NET Core 8 Web API    │   │
│  │   Cantine.TcpListener  │───▶│                              │   │
│  │                        │    │  POST /api/auth/login        │   │
│  │  • TcpListener multi-  │    │  GET  /api/auth/me           │   │
│  │    readers             │    │  GET  /api/meals             │   │
│  │  • Parser trames       │    │  GET  /api/dashboard/stream  │   │
│  │    Morpho              │    │  GET  /api/export/excel      │   │
│  │  • Validation éligib.  │    │  GET  /api/readers/status    │   │
│  │  • ESC/POS printing    │    │                              │   │
│  │  • Reconnexion auto    │    └──────────────────────────────┘   │
│  └───────────────────────┘                  │                    │
│               │                             │                    │
│               ▼                             ▼                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    SQL Server Express 2022                  │  │
│  │   Employees · MealLogs · Readers · Tickets · Users · Roles │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │          React 18 + TypeScript  (servi par IIS)             │  │
│  │          Ant Design · Recharts · EventSource API            │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
         ▲  TCP                                 ▲  TCP
         │  (port à confirmer)                  │  port 9100
         │                                      │
  Morpho Sigma Lite+                   Imprimantes thermiques
  (1..N lecteurs)                      réseau (1 par lecteur)
```

---

## Structure de la Solution Visual Studio

```
Cantine.sln
├── Cantine.Core/               # Entités, interfaces, DTOs (pas de dépendances)
│   ├── Entities/
│   │   ├── Employee.cs
│   │   ├── MealLog.cs
│   │   ├── Reader.cs
│   │   └── Ticket.cs
│   ├── Interfaces/
│   │   ├── IMealService.cs
│   │   ├── IEscPosService.cs
│   │   └── IMorphoParser.cs
│   └── DTOs/
│
├── Cantine.Infrastructure/     # Implémentations techniques
│   ├── Data/
│   │   ├── CantineDbContext.cs
│   │   └── Migrations/
│   ├── Tcp/
│   │   └── MorphoFrameParser.cs   ← code récupéré du projet existant
│   ├── Printing/
│   │   └── EscPosService.cs
│   └── Excel/
│       └── ExcelExportService.cs
│
├── Cantine.TcpListener/        # Windows Service
│   ├── MorphoListenerService.cs   ← BackgroundService wrappant le parser existant
│   └── Program.cs                 ← UseWindowsService()
│
├── Cantine.API/                # ASP.NET Core Web API
│   ├── Controllers/
│   │   ├── AuthController.cs
│   │   ├── MealsController.cs
│   │   ├── DashboardController.cs  ← endpoint SSE
│   │   ├── ExportController.cs
│   │   └── ReadersController.cs
│   └── Program.cs
│
└── cantine-web/                # React 18 + TypeScript (Vite)
    ├── src/
    │   ├── auth/               ← récupéré du projet auth existant
    │   │   ├── AuthContext.tsx
    │   │   ├── useAuth.ts
    │   │   └── PrivateRoute.tsx
    │   ├── pages/
    │   │   ├── Login.tsx       ← récupéré du projet auth existant
    │   │   ├── Dashboard.tsx
    │   │   ├── MealLogs.tsx
    │   │   └── Settings.tsx
    │   └── api/
    │       └── axios.ts        ← interceptors JWT récupérés du projet existant
    └── vite.config.ts
```

---

## Flux de Traitement Principal (Pointage)

```
Employé pose son doigt sur le lecteur
        │
        ▼
Morpho Sigma Lite+ envoie trame TCP
        │
        ▼
MorphoListenerService.cs reçoit la trame
        │
        ▼
MorphoFrameParser.cs décode : matricule + bouton (E/S) + reader_id + timestamp
        │
        ├─ Vérification éligibilité (SQL Server)
        │   • Employé connu ?
        │   • Quota journalier atteint ? (1/jour standard, 2/jour gardiens)
        │   • Shift actif ? (Phase 2)
        │
        ├─── NON éligible → log refus → fin
        │
        └─── OUI éligible
                │
                ├── INSERT MealLog (SQL Server)
                ├── Génération ticket ESC/POS → TcpClient → imprimante IP:9100
                └── Broadcast SSE → /api/dashboard/stream → mise à jour dashboard React
```

---

## Authentification

### Contrat JWT (identique au projet Node.js existant)

```json
{
  "sub": "user_id",
  "name": "Nom Prénom",
  "role": "AdminSEBN",
  "exp": 1234567890
}
```

### Rôles

| Rôle | Accès |
|------|-------|
| `AdminSEBN` | Tout (lecteurs, employés, export, config, utilisateurs) |
| `ResponsableCantine` | Dashboard temps réel + export Excel uniquement |

### Endpoints Auth

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/login` | Retourne `{ token, user }` |
| POST | `/api/auth/logout` | Invalide la session |
| GET | `/api/auth/me` | Profil utilisateur courant |

---

## Impression Thermique

- **Protocole :** ESC/POS via TCP direct sur port **9100** (Jetdirect)
- **Connexion :** 1 imprimante réseau par lecteur, adresse IP statique configurée en base
- **Pas de driver Windows requis** — envoi binaire direct depuis `Cantine.TcpListener`
- **Contenu du ticket :** voir section 4 du PRD (en-tête, identité, détails, type repas, N° ticket, zone)

---

## Export Excel

- Endpoint : `GET /api/export/excel?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Généré côté serveur avec **ClosedXML** (streaming, pas de chargement en mémoire complet)
- Colonnes : Matricule, Nom, Prénom, Date, Heure, Type repas, Lecteur
- Ligne de totaux par type de repas en pied de tableau

---

## Real-time Dashboard

- **Technologie :** Server-Sent Events (SSE) — unidirectionnel serveur → clients
- **Endpoint :** `GET /api/dashboard/stream` (Content-Type: `text/event-stream`)
- **Données pushées :** compteur repas par type, derniers pointages, statut lecteurs
- **Côté React :** `EventSource` API native, pas de librairie tierce requise

---

## Base de Données

### Schéma principal (Phase 1)

```sql
Employees    (matricule PK, nom, prenom, category, max_meals_per_day)
Readers      (id PK, name, ip_address, printer_ip, is_active)
MealLogs     (id PK, matricule FK, reader_id FK, timestamp, meal_type, ticket_number)
Tickets      (ticket_number PK, meal_log_id FK, printed_at, escpos_data)
Users        (id PK, username, password_hash, role, is_active)
```

### Contraintes SQL Express

- Limite : **10 GB** — estimation ~100-150 MB/an pour 2000 employés → safe pour 10+ ans
- Archivage mensuel prévu à partir de la Phase 2 pour rester sous les limites
- Pas de réplication native → backup automatique toutes les 4h via Windows Task Scheduler

---

## Intégration des Projets Existants

### 1. TCP Listener C# (Console App existante)

| Avant | Après |
|-------|-------|
| `static void Main()` + boucle infinie | `BackgroundService.ExecuteAsync()` |
| 1 seul lecteur codé en dur | Multi-readers depuis config SQL |
| Pas de reconnexion | Retry loop avec `CancellationToken` |
| Pas d'impression | Appel `IEscPosService.PrintTicket()` |
| Process isolé | Windows Service (`sc create`) |

Le code de parsing des trames Morpho est extrait tel quel dans `Cantine.Infrastructure/Tcp/MorphoFrameParser.cs`.

### 2. Auth React + Node.js (projet existant)

| Composant | Action |
|-----------|--------|
| Pages Login/Logout React | Copié dans `cantine-web/src/auth/` |
| `AuthContext` + `useAuth` | Copié sans modification |
| Axios interceptors JWT | Copié dans `cantine-web/src/api/axios.ts` |
| `PrivateRoute` | Copié sans modification |
| Backend Node.js | **Remplacé** par ASP.NET Core Identity + SQL Server |
| Stockage users JSON | **Migré** en one-shot vers table `Users` SQL Server |

Le contrat JWT est **préservé à l'identique** pour éviter toute modification du React.
Seule contrainte : utiliser le même secret JWT pendant la période de transition.

---

## Déploiement

```
Serveur Windows (IIS + .NET 8 Runtime installés)
│
├── IIS Site : cantine.sebn.local
│   ├── /          → cantine-web/ (fichiers statiques React buildés)
│   └── /api/*     → Cantine.API (ASP.NET Core, reverse proxy IIS)
│
└── Windows Services
    └── CantineTcpService  (Cantine.TcpListener, démarrage automatique)
```

**Commande d'installation du service :**
```bash
sc create CantineTcpService binPath= "C:\Services\Cantine.TcpListener\Cantine.TcpListener.exe" start= auto
sc failure CantineTcpService reset= 60 actions= restart/5000/restart/10000/restart/30000
```

---

## Points à Confirmer

> Ces points nécessitent des informations du fournisseur ou de l'environnement cible avant de commencer le développement.

| # | Point | Impact |
|---|-------|--------|
| 1 | **Port TCP des lecteurs Morpho** — port exact (probablement 22090) et format des trames (ASCII délimité ou binaire ?) | Parsing `MorphoFrameParser.cs` |
| 2 | **Nombre de lecteurs Phase 1** — combien de lecteurs et imprimantes à déployer initialement | Architecture multi-readers, tests charge |
| 3 | **Accès MorphoManager** — API disponible ou import SQL direct pour la synchro employés (Phase 2) | `Cantine.Infrastructure/Sync/` |
| 4 | **Modèle imprimantes thermiques** — ESC/POS standard ou commandes propriétaires ? Largeur papier (58 ou 80 mm) ? | `EscPosService.cs` |
| 5 | **Secret JWT actuel** — valeur du secret utilisé dans le projet Node.js existant | Migration auth sans déconnexion forcée |
