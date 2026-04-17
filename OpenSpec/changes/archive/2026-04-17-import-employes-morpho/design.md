## Context

CantineSEBN est désormais multi-site (SEBN-TN01, SEBN-TN02). Chaque site dispose de sa propre instance MorphoManager avec sa propre base SQL Server. La configuration de connexion vers chaque base MorphoManager est stockée dans la table `MorphoConfigs` (SiteId → ConnectionString, Query, CommandTimeout), administrable depuis l'interface sans redéploiement.

L'import est déclenché manuellement par l'AdminSEBN depuis l'interface. Il est ponctuel (Phase 1) et ne remplace pas la synchronisation automatique prévue en Phase 2.

**Prérequis :** le change `multi-site-architecture` doit être appliqué (table `Sites`, `MorphoConfigs`, `SiteId` sur `Employees`).

## Goals / Non-Goals

**Goals:**
- Lire la config MorphoManager depuis `MorphoConfigs` en DB (pas d'appsettings)
- Lire les employés depuis la base MorphoManager du site via `SqlConnection` directe
- Insérer les nouveaux employés dans `CantineSEBN.Employees` avec le bon `SiteId`
- Mettre à jour Nom/Prénom si `(SiteId, Matricule)` existe déjà
- Retourner un résumé : importés, mis à jour, ignorés
- Exposer `POST /api/employes/import-morpho/{siteId}` sécurisé `AdminSEBN`
- Bouton d'import dans l'interface React avec sélection du site

**Non-Goals:**
- Synchronisation automatique / temps réel (Phase 2)
- Import de la photo biométrique ou des droits d'accès
- Suppression d'employés depuis CantineSEBN si absents de MorphoManager
- Import depuis plusieurs bases MorphoManager simultanément

## Decisions

### 1. SqlConnection directe pour lire MorphoManager
**Choix :** `Microsoft.Data.SqlClient` avec requête SQL brute lue depuis `MorphoConfigs.Query`.
**Pourquoi :** La base MorphoManager est externe, son schéma n'est pas cartographié dans le modèle EF Core. Ajouter un second DbContext serait disproportionné pour une lecture ponctuelle.

### 2. Configuration lue depuis MorphoConfigs en DB
**Choix :** `MorphoEmployeeImporter` reçoit le `DbContext` CantineSEBN et lit `MorphoConfigs` par `siteId` avant d'ouvrir la connexion SqlClient.
**Pourquoi :** Cohérent avec la décision d'architecture multi-site (config centralisée en DB, pas en appsettings). L'AdminSEBN peut modifier la connexion sans redéploiement.
**Conséquence :** Si aucune `MorphoConfig` n'existe pour le site, l'import retourne une erreur explicite (`MorphoConfig non trouvée pour le site SEBN-TN01`).

### 3. Idempotence via Upsert sur (SiteId, Matricule)
**Choix :** Vérification par PK composite `(SiteId, Matricule)`. Si absent → INSERT avec `MaxMealsPerDay = 1`. Si présent → UPDATE Nom/Prénom uniquement (ne pas écraser `MaxMealsPerDay` configuré manuellement).
**Pourquoi :** Permet de relancer l'import sans doublon ni perte de configuration manuelle.

### 4. Noms de colonnes MorphoManager configurables
**Choix :** La requête SQL complète est stockée dans `MorphoConfigs.Query` (configurable par site).
**Pourquoi :** Le schéma exact de MorphoManager peut varier selon la version installée sur chaque site. Requête par défaut : `SELECT BadgeNumber AS Matricule, LastName AS Nom, FirstName AS Prenom FROM Users WHERE Active = 1`.

## Risks / Trade-offs

- **MorphoConfig absente pour un site** → Erreur 400 avec message explicite. L'AdminSEBN doit d'abord configurer la connexion dans la page Sites.
- **Connexion MorphoManager indisponible** → Timeout géré avec `MorphoConfigs.CommandTimeout`. Erreur propagée à l'UI.
- **Volume important d'employés** → Import séquentiel (pas de bulk insert EF Core en Phase 1). Acceptable pour quelques centaines d'employés par site.

## Migration Plan

1. S'assurer que `multi-site-architecture` est appliqué (table `MorphoConfigs` existante)
2. L'AdminSEBN configure la connexion MorphoManager pour chaque site dans la page Sites
3. L'AdminSEBN déclenche l'import depuis la page Employés en sélectionnant le site
4. Vérifier les compteurs retournés (importés / mis à jour / ignorés)
5. **Rollback :** Les employés importés peuvent être supprimés manuellement par site — aucune migration BDD requise pour cette feature.

## Open Questions

- Noms exacts des colonnes dans la version de MorphoManager installée sur site → à vérifier au premier déploiement (la requête est configurable).
- Les bases MorphoManager de TN01 et TN02 sont-elles sur les mêmes serveurs que CantineSEBN ou sur des machines séparées ?
