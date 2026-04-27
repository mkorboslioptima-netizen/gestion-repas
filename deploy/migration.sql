-- ============================================================
-- Cantine SEBN -- Script de création complète (SQL Server 2017)
-- Généré depuis le model snapshot EF Core
-- À exécuter sur une base CantineSEBN vide
-- ============================================================

SET XACT_ABORT ON;
GO

-- Table de suivi des migrations EF Core
IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

-- ── 1. Sites ──────────────────────────────────────────────────
CREATE TABLE [Sites] (
    [SiteId]  nvarchar(20)  NOT NULL,
    [Nom]     nvarchar(100) NOT NULL,
    [Actif]   bit           NOT NULL CONSTRAINT [DF_Sites_Actif] DEFAULT 1,
    CONSTRAINT [PK_Sites] PRIMARY KEY ([SiteId])
);
GO

INSERT INTO [Sites] ([SiteId], [Nom], [Actif])
VALUES
    (N'SEBN-TN01', N'SEBN Tunis 01', 1),
    (N'SEBN-TN02', N'SEBN Tunis 02', 1);
GO

-- ── 2. MorphoConfigs ──────────────────────────────────────────
CREATE TABLE [MorphoConfigs] (
    [SiteId]           nvarchar(20)   NOT NULL,
    [ConnectionString] nvarchar(500)  NOT NULL,
    [Query]            nvarchar(1000) NOT NULL,
    [CommandTimeout]   int            NOT NULL CONSTRAINT [DF_MorphoConfigs_CommandTimeout] DEFAULT 30,
    CONSTRAINT [PK_MorphoConfigs] PRIMARY KEY ([SiteId]),
    CONSTRAINT [FK_MorphoConfigs_Sites_SiteId]
        FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE CASCADE
);
GO

-- ── 3. Lecteurs ───────────────────────────────────────────────
CREATE TABLE [Lecteurs] (
    [Id]            int           NOT NULL IDENTITY(1,1),
    [Nom]           nvarchar(100) NOT NULL,
    [AdresseIP]     nvarchar(45)  NOT NULL,
    [Actif]         bit           NOT NULL CONSTRAINT [DF_Lecteurs_Actif] DEFAULT 1,
    [SiteId]        nvarchar(20)  NOT NULL,
    [PrinterIP]     nvarchar(45)  NULL,
    [NomImprimante] nvarchar(100) NULL,
    [PortImprimante] int          NOT NULL CONSTRAINT [DF_Lecteurs_PortImprimante] DEFAULT 9100,
    CONSTRAINT [PK_Lecteurs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Lecteurs_Sites_SiteId]
        FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_Lecteurs_AdresseIP] ON [Lecteurs] ([AdresseIP]);
CREATE INDEX [IX_Lecteurs_SiteId] ON [Lecteurs] ([SiteId]);
GO

-- ── 4. Employees ─────────────────────────────────────────────
CREATE TABLE [Employees] (
    [SiteId]        nvarchar(20)  NOT NULL,
    [Matricule]     nvarchar(20)  NOT NULL,
    [Nom]           nvarchar(100) NOT NULL,
    [Prenom]        nvarchar(100) NOT NULL,
    [MaxMealsPerDay] int          NOT NULL CONSTRAINT [DF_Employees_MaxMealsPerDay] DEFAULT 1,
    [Actif]         bit           NOT NULL CONSTRAINT [DF_Employees_Actif] DEFAULT 1,
    CONSTRAINT [PK_Employees] PRIMARY KEY ([SiteId], [Matricule]),
    CONSTRAINT [FK_Employees_Sites_SiteId]
        FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE NO ACTION
);
GO

-- ── 5. MealLogs ───────────────────────────────────────────────
CREATE TABLE [MealLogs] (
    [Id]        int           NOT NULL IDENTITY(1,1),
    [SiteId]    nvarchar(20)  NOT NULL,
    [Matricule] nvarchar(20)  NOT NULL,
    [LecteurId] int           NOT NULL,
    [Timestamp] datetime2     NOT NULL,
    [RepasType] int           NOT NULL,
    CONSTRAINT [PK_MealLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_MealLogs_Employees_SiteId_Matricule]
        FOREIGN KEY ([SiteId], [Matricule]) REFERENCES [Employees] ([SiteId], [Matricule]) ON DELETE NO ACTION,
    CONSTRAINT [FK_MealLogs_Lecteurs_LecteurId]
        FOREIGN KEY ([LecteurId]) REFERENCES [Lecteurs] ([Id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_MealLogs_LecteurId] ON [MealLogs] ([LecteurId]);
CREATE INDEX [IX_MealLogs_SiteId_Matricule] ON [MealLogs] ([SiteId], [Matricule]);
GO

-- ── 6. SyncLogs ───────────────────────────────────────────────
CREATE TABLE [SyncLogs] (
    [Id]         int          NOT NULL IDENTITY(1,1),
    [SiteId]     nvarchar(20) NOT NULL,
    [Source]     nvarchar(10) NOT NULL,
    [OccurredAt] datetime2    NOT NULL,
    [Importes]   int          NOT NULL,
    [MisAJour]   int          NOT NULL,
    [Desactives] int          NOT NULL,
    [Ignores]    int          NOT NULL,
    CONSTRAINT [PK_SyncLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_SyncLogs_Sites_SiteId]
        FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE CASCADE
);

CREATE INDEX [IX_SyncLogs_SiteId] ON [SyncLogs] ([SiteId]);
GO

-- ── 7. AppUsers ───────────────────────────────────────────────
CREATE TABLE [AppUsers] (
    [Id]           int           NOT NULL IDENTITY(1,1),
    [Nom]          nvarchar(100) NOT NULL,
    [Email]        nvarchar(200) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Role]         nvarchar(50)  NOT NULL,
    [IsActive]     bit           NOT NULL CONSTRAINT [DF_AppUsers_IsActive] DEFAULT 1,
    [SiteId]       nvarchar(20)  NULL,
    [CreatedAt]    datetime2     NOT NULL,
    [CreatedBy]    nvarchar(200) NULL,
    [LastLoginAt]  datetime2     NULL,
    CONSTRAINT [PK_AppUsers] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_AppUsers_Sites_SiteId]
        FOREIGN KEY ([SiteId]) REFERENCES [Sites] ([SiteId]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_AppUsers_Email] ON [AppUsers] ([Email]);
CREATE INDEX [IX_AppUsers_SiteId] ON [AppUsers] ([SiteId]);
GO

-- ── 8. UserAuditLogs ─────────────────────────────────────────
CREATE TABLE [UserAuditLogs] (
    [Id]           int          NOT NULL IDENTITY(1,1),
    [ActorId]      int          NOT NULL,
    [TargetUserId] int          NOT NULL,
    [Action]       nvarchar(50) NOT NULL,
    [Details]      nvarchar(500) NULL,
    [Timestamp]    datetime2    NOT NULL,
    CONSTRAINT [PK_UserAuditLogs] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_UserAuditLogs_AppUsers_ActorId]
        FOREIGN KEY ([ActorId]) REFERENCES [AppUsers] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_UserAuditLogs_AppUsers_TargetUserId]
        FOREIGN KEY ([TargetUserId]) REFERENCES [AppUsers] ([Id]) ON DELETE NO ACTION
);

CREATE INDEX [IX_UserAuditLogs_ActorId] ON [UserAuditLogs] ([ActorId]);
CREATE INDEX [IX_UserAuditLogs_TargetUserId] ON [UserAuditLogs] ([TargetUserId]);
GO

-- ── 9. Marquer toutes les migrations comme appliquées ─────────
INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES
    (N'20260414103244_AddLecteursTable',        N'10.0.7'),
    (N'20260414131357_AddEmployeesAndMealLogs', N'10.0.7'),
    (N'20260416133809_AddMultiSiteSupport',     N'10.0.7'),
    (N'20260416144700_AddEmployeeActif',        N'10.0.7'),
    (N'20260417092723_AddSyncLogsTable',        N'10.0.7'),
    (N'20260417092923_CreateSyncLogsTable',     N'10.0.7'),
    (N'20260417145710_AddAppUsers',             N'10.0.7'),
    (N'20260420111703_AddAppUserAuditFields',   N'10.0.7'),
    (N'20260421084843_AddLastLoginAt',          N'10.0.7'),
    (N'20260423072358_AddPrinterFieldsToLecteurs', N'10.0.7');
GO

PRINT 'Base CantineSEBN créée avec succès. 8 tables + historique migrations.';
GO
