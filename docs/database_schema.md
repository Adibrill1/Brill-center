# Database Schema Overview
- **Users**: id, role (operator/client), name, email, language_pref.
- **Spaces**: id, name_he, name_en, type (digital/analog/hybrid), owner_id.
- **Bookings**: id, space_id, user_id, start_time, end_time, status.
- **Inventory**: id, space_id, item_name_he, item_name_en, quantity, threshold.
- **Ideas**: id, space_id, user_id, content_he, content_en, status (proposed/approved/rejected), votes_count.
- **Treasury**: id, space_id, balance, currency, transactions_json (audit log).
- **Translations**: key, value_he, value_en.

*Note: Use JSONB for dynamic attributes (e.g., config for analog kits).*