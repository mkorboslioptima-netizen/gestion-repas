## 📌 1. Présentation du Projet

L'objectif est de mettre en place un système automatisé de gestion des repas basé sur des lecteurs biométriques **Morpho Sigma Lite+**. Le système doit identifier l'employé, vérifier son éligibilité, enregistrer le type de repas choisi et imprimer un ticket thermique pour le restaurateur.

## ⚙️ 2. Architecture Technique

- **Mode de communication :** TCP en temps réel depuis les lecteurs.
    
- **Base de données :** SQL Server Express indépendante.
    
- **Interface :** Application Web (multi-accès).
    
- **Entrées de données (Trame TCP) :** Matricule, Date, Heure, ID Lecteur (S/N), Statut bouton E/S.
    
- **Logique des boutons :** * Bouton **SORTIE** (`O` dans la trame TCP) = Plat Chaud (Repas Type 1).
    
    - Bouton **ENTRÉE** (`I` dans la trame TCP) = Sandwich / Repas froid (Repas Type 2).
        

---

## 🚀 3. Roadmap de Développement

### 🟢 Phase 1 : MVP (Produit Minimum Viable)

**Focus : Employés SEBN et Gardiens + Facturation de base.**

- **Gestion des Lecteurs :** Configuration d'une liste de plusieurs lecteurs avec Nom et adresse IP.
    
- **Base Employés :** Import initial depuis la base de données Morphomanager (Matricule, Nom, Prénom).
    
- **Règles d'accès :** * Standard : 1 repas par jour.
    
    - Gardiens : 2 repas par jour (configurés manuellement en base).
        
- **Impression Ticket :** Génération automatique (Matricule, Nom, Prénom, Date, Heure, N° Ticket, Type de repas, ID pointeuse) depuis une imprimante thermiques, à prévoir une imprimante par lecteur .
    
- **Export Excel :** Extraction des pointages par période (date à date) avec totaux par type de repas pour le restaurateur.
    
- **Dashboards :** État en temps réel du nombre de repas accordés.
    
- **Accès :** Profil "Admin SEBN" et profil "Responsable Cantine".
    

### 🔵 Phase 2 : V1 (Automatisation & Shifts)

**Focus : Réduction des interventions manuelles.**

- **Moteur de Shifts :** Attribution automatique des repas selon l'heure.
    
    - Matin : 08h00 – 12h00.
        
    - Administration : 12h00 – 14h00.
        
    - Après-midi : 16h00 – 21h00.
        
    - Nuit : 00h00 – 04h00.
        
- **Synchronisation Auto :** Lien dynamique avec MorphoManager pour gérer les nouveaux arrivants et les blocages (départs).
    
- **Supervision :** Statut de connexion des lecteurs et imprimantes en direct.
    

### 🟡 Phase 3 : V2 (Périmètre Complet)

**Focus : Visiteurs, Stagiaires et Heures Supplémentaires.**

- **Profils Externes :** Gestion des Stagiaires, Sous-traitants et Prestataires.
    
- **Module Visiteurs :** Saisie manuelle par l'Admin SEBN avec période de validité (date à date).
    
- **Heures Supplémentaires :** Import Excel des listes d'employés autorisés à un 2ème repas (Lundi-Vendredi).
    
- **Analytique :** Rapports croisés par lecteurs, catégorie d'utilisateur et zone, repas, types de repas.
    

---

## ✅ 5. Journal de Déploiement & Corrections (2026-04-27)

### 🔧 Corrections Backend

#### Bug : Conflit de tracking EF Core lors de l'import Morpho
- **Fichier :** `Cantine.Infrastructure/MorphoManager/MorphoEmployeeImporter.cs`
- **Problème :** La boucle upsert chargeait les employés un par un (N+1), puis `desactiverAbsents` rechargait les mêmes entités → conflit dans le change tracker EF Core.
- **Fix :** Chargement unique en dictionnaire (`ToDictionaryAsync`) + dédoublonnage des matricules Morpho (`GroupBy`).

#### Bug : Suppression de site — erreur 500 (contrainte FK)
- **Fichier :** `Cantine.API/Controllers/SitesController.cs`
- **Problème :** Le DELETE ne supprimait pas `SyncLogs` et `MorphoConfig` avant le site → violation de contrainte FK SQL Server.
- **Fix :** Suppression en cascade de `SyncLogs` et `MorphoConfig` avant le site + blocage si des lecteurs existent.

#### Bug : `ISupervisionChecker` non enregistré
- **Fichier :** `Cantine.API/Program.cs`
- **Problème :** Le service tournait avec un ancien binaire compilé avant l'enregistrement DI.
- **Fix :** Rebuild + redéploiement.

### 🔧 Corrections Frontend

#### Feature manquante : Icône œil sur le champ mot de passe
- **Fichier :** `cantine-web/src/pages/LoginPage.tsx`
- **Problème :** Le `dist` déployé ne contenait pas le rebuild après ajout de la feature.
- **Fix :** `npm run build` et recopie du `dist`.

### 🚀 Procédure de Déploiement

#### API (Cantine.API)
```bash
dotnet publish Cantine.API -c Release -o publish\Cantine.API
# Copier publish\Cantine.API\ sur le serveur
iisreset
```
> **Important :** Ne jamais écraser `appsettings.json` sur le serveur.

#### Frontend (cantine-web)
```bash
cd cantine-web
npm run build
# Copier dist\ sur le serveur
```

#### TCP Listener (Cantine.TcpListener)
```bash
dotnet publish Cantine.TcpListener -c Release -o publish\Cantine.TcpListener
sc.exe create "CantineTcpListener" binPath= "C:\Deploy\Cantine.TcpListener\Cantine.TcpListener.exe --windows-service" start= auto DisplayName= "Cantine TCP Listener"
Start-Service -Name "CantineTcpListener"
```

### ⚙️ Configuration Serveur (`appsettings.json`)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=10.9.71.10\\TIL;Database=CantineSEBN;User Id=sa;Password=TIL-technologies;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "CHANGE_ME_SECRET_KEY_32_CHARS_MIN",
    "Issuer": "CantineSEBN",
    "Audience": "CantineSEBN"
  }
}
```

### ⚙️ Configuration MorphoManager

| SiteId | Serveur | Base |
|--------|---------|------|
| SEBN-TN02 | `10.9.71.10\TIL` | `MorphoManager` |

Chaîne de connexion :
```
Server=10.9.71.10\TIL;Database=MorphoManager;User Id=sa;Password=TIL-technologies;TrustServerCertificate=True;
```

À insérer via SQL si absent :
```sql
INSERT INTO MorphoConfigs (SiteId, ConnectionString, CommandTimeout)
VALUES ('SEBN-TN02', 'Server=10.9.71.10\TIL;Database=MorphoManager;User Id=sa;Password=TIL-technologies;TrustServerCertificate=True;', 30)
```

### 🔑 Réinitialisation Mot de Passe Admin

Hash BCrypt pour `Admin123!` :
```sql
UPDATE AppUsers
SET PasswordHash = '$2a$11$AiU6We.FsNexd9X.hEi.kuY1xqOjdbB7XtCWmlISRapyiUBgL0zI2'
WHERE Email = 'votre@email.com'
```

---

## 📝 4. Contenu du Ticket Thermique (MVP)

1. **En-tête :** CANTINE SEBN
    
2. **Identité :** Matricule - Nom & Prénom
    
3. **Détails :** Date et Heure de passage
    
4. **Repas :** TYPE DE REPAS (PLAT ou SANDWICH)
    
5. **Compteur :** Ticket N° XXXXX
    
6. **Pointeuse :** Zone de pointage