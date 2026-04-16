## Context

CantineSEBN dispose déjà d'un import ponctuel manuel (`MorphoEmployeeImporter`) et d'un Windows Service TCP (`Cantine.TcpListener`) qui tourne en permanence. La synchronisation automatique s'appuie sur ces deux composants existants : le service TCP accueille un second `IHostedService` de planification, et l'importer existant est étendu pour gérer la désactivation des absents.

## Goals / Non-Goals

**Goals:**
- Synchroniser automatiquement chaque site actif ayant une `MorphoConfig` toutes les 6 heures.
- Désactiver (sans supprimer) les employés absents de MorphoManager lors de la synchro auto.
- Permettre un déclenchement manuel depuis l'UI avec résumé par site.
- Logger chaque synchro avec timestamp, site, et compteurs.

**Non-Goals:**
- Synchronisation en temps réel ou par événement Morpho.
- Suppression physique des employés depuis CantineSEBN.
- Synchronisation des données biométriques ou des droits d'accès.
- Gestion des conflits de matricule entre sites (hors périmètre Phase 1).

## Decisions

### 1. Job planifié dans Cantine.TcpListener via `PeriodicTimer`
**Choix :** `IHostedService` avec `PeriodicTimer` (6 heures) dans le Windows Service existant.
**Pourquoi :** Le service TCP tourne déjà 24h/24. Ajouter un second `IHostedService` dans le même processus évite un déploiement supplémentaire. `PeriodicTimer` (.NET 6+) est plus propre qu'un `Task.Delay` en boucle.
**Alternative écartée :** Windows Task Scheduler externe — dépendance à la config OS, plus difficile à monitorer depuis l'app.

### 2. Paramètre `desactiverAbsents` sur `IMorphoEmployeeImporter.ImportAsync`
**Choix :** Signature `ImportAsync(string siteId, bool desactiverAbsents = false)`.
**Pourquoi :** L'import manuel (bouton UI) ne doit jamais désactiver d'employés — une mauvaise requête SQL ou une base Morpho temporairement incomplète pourrait désactiver tout le personnel. La désactivation n'est activée que par la synchro automatique (où l'opérateur est informé par les logs).
**Conséquence :** Interface `IMorphoEmployeeImporter` mise à jour — signature compatible (paramètre optionnel).

### 3. Endpoint `POST /api/employes/sync-morpho` asynchrone
**Choix :** L'endpoint démarre la synchro de tous les sites en background (`Task.Run`) et retourne immédiatement `202 Accepted` avec un message. Le résultat final est visible dans les logs et sera affiché par une notification SSE (Phase 2).
**Pourquoi :** La synchro multi-sites peut prendre plusieurs secondes. Un retour synchrone risque le timeout HTTP. En Phase 1, le retour `202` est suffisant — l'UI affiche "Synchronisation lancée".
**Alternative écartée :** Retour synchrone avec liste des résultats par site — risque timeout pour 3+ sites.

### 4. Désactivation des absents : `Actif = false` sur `Employee`
**Choix :** Ajouter une colonne `Actif bool` sur `Employee` (migration EF Core). Lors de la synchro auto, tout employé du site absent de la liste Morpho reçoit `Actif = false`. Le service TCP ignore les employés inactifs lors du traitement des trames.
**Pourquoi :** Conserver l'historique des MealLogs liés à l'employé. La suppression physique casserait les FK.
**Conséquence :** `MealEligibilityService` doit vérifier `employee.Actif` avant d'approuver un pointage.

## Risks / Trade-offs

- **Base Morpho temporairement vide ou inaccessible** → Si la connexion échoue, la synchro est annulée silencieusement pour ce site (pas de désactivation). Un log `WARNING` est émis.
- **Requête Morpho retourne 0 résultats** → Sécurité ajoutée : si le résultat contient 0 employés, la désactivation n'est pas appliquée (protection contre requête mal configurée).
- **Délai de 6h** → Un nouvel employé peut devoir attendre jusqu'à 6h avant de pouvoir pointer. Mitigation : le bouton "Synchroniser" permet de forcer immédiatement.
- **Migration `Actif` sur Employee** → Breaking change sur `EmployeeConfiguration`. En Phase 1, la table est vide ou contient peu de données — migration propre. En production : `DEFAULT 1` sur la colonne pour ne pas casser les employés existants.

## Migration Plan

1. Ajouter la colonne `Actif` sur `Employee` avec migration EF Core `AddEmployeeActif` (DEFAULT true).
2. Mettre à jour `MealEligibilityService` pour vérifier `employee.Actif`.
3. Déployer `Cantine.TcpListener` mis à jour (nouveau `IHostedService`).
4. Déployer `Cantine.API` mis à jour (nouvel endpoint).
5. Déployer `cantine-web` mise à jour (bouton Synchroniser).
**Rollback :** Redéployer les versions précédentes. La colonne `Actif` peut rester (valeur `true` par défaut, sans effet).

## Open Questions

- Faut-il notifier l'AdminSEBN par email ou notification UI lorsque des employés sont désactivés automatiquement ? (Phase 2)
- Le délai de 6h est-il configurable en `appsettings.json` ou fixe en code ?
