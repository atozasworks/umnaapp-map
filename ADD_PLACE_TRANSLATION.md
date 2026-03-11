# Add Place – Auto Translation Feature

## Summary

Add Place popup now supports **English + Local Language** names with auto-translation based on map location.

### Flow

1. User clicks on map → reverse geocode fetches address (state, district).
2. System detects **target language** from state (e.g. Karnataka → Kannada, Tamil Nadu → Tamil).
3. User types in **Place Name (English)** → system translates to local language and fills **Local Language Name**.
4. Both fields are editable; user can correct translations manually.
5. On save, both `place_name_en` and `place_name_local` are stored for future multi-language display.

### State → Language Mapping

| State           | Language   |
|-----------------|------------|
| Karnataka       | Kannada (kn) |
| Tamil Nadu      | Tamil (ta)   |
| Kerala          | Malayalam (ml) |
| Andhra Pradesh, Telangana | Telugu (te) |
| North India (UP, Rajasthan, etc.) | Hindi (hi) |
| Maharashtra     | Marathi (mr) |
| Gujarat         | Gujarati (gu) |
| West Bengal, Tripura | Bengali (bn) |
| Punjab          | Punjabi (pa) |

### API

- **POST /api/map/translate** – `{ text, targetLang }` → `{ translatedText }`
- **GET /api/map/reverse** – now returns `targetLang` for the clicked location
- **POST /api/map/places** – accepts `place_name_en`, `place_name_local` (in addition to existing fields)

### Translation Backend

- **Atozas Translate**: Set `ATOZAS_TRANSLATE_API_URL` (and `ATOZAS_TRANSLATE_API_KEY` if needed) in `.env`.
- **Fallback**: Uses Google Translate (via `@vitalets/google-translate-api`) when Atozas is not configured.

### Database

Add these columns if they don't exist (e.g. run the SQL from `backend/prisma/add-place-table.sql`):

```sql
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_en" TEXT;
ALTER TABLE "Place" ADD COLUMN IF NOT EXISTS "place_name_local" TEXT;
UPDATE "Place" SET "place_name_en" = "name" WHERE "place_name_en" IS NULL AND "name" IS NOT NULL;
```

Then run:

```bash
cd backend && npx prisma generate
```

Restart the backend server after schema/DB changes.
