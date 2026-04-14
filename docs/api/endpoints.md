# API Endpoints — Cantine SEBN

Documentation de tous les endpoints REST.
Mis à jour automatiquement par l'agent `docs-writer`.

---

## Auth

### POST /api/auth/login
**Auth :** Public
**Body :** `{ "username": "string", "password": "string" }`
**Retourne :** `{ "token": "string", "user": { "id": int, "username": "string", "role": "string" } }`

### POST /api/auth/logout
**Auth :** Requis
**Retourne :** `204 No Content`

### GET /api/auth/me
**Auth :** Requis
**Retourne :** `UserDto`

---

_(Endpoints ajoutés par docs-writer après chaque feature)_
