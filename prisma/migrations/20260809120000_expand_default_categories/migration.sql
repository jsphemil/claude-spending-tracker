-- Expands the starter category set (spec 5.3) with more categories that
-- apply broadly across users, and backfills them onto existing accounts so
-- the default set stays standard/consistent for everyone, not just new
-- signups. Existing category names are left untouched (no renames) so
-- nothing already in use by a transaction/recurring rule is disturbed —
-- this only adds categories that don't already exist for a user.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public."Profile" (id, "updatedAt")
  VALUES (NEW.id, now());

  INSERT INTO public."Category" (id, "userId", type, name, icon, color, "isSystemDefault", "updatedAt")
  VALUES
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Groceries', '🛒', '#22c55e', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Eating Out', '🍽️', '#f97316', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Shopping', '🛍️', '#ec4899', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Rent', '🏠', '#8b5cf6', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Bills & Utilities', '💡', '#eab308', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Transportation', '🚗', '#3b82f6', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Health', '💊', '#ef4444', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Entertainment', '🎬', '#6366f1', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Travel', '✈️', '#06b6d4', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Education', '📚', '#a855f7', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Pets', '🐾', '#f59e0b', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Home Maintenance', '🔧', '#64748b', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Subscriptions', '📱', '#0ea5e9', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Gifts & Donations', '🎁', '#d946ef', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Other', '❓', '#71717a', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Salary', '💼', '#16a34a', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Business', '🏢', '#0ea5e9', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Gifts', '🎁', '#d946ef', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Interest', '📈', '#14b8a6', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Rental Income', '🏠', '#8b5cf6', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Other Income', '❓', '#71717a', true, now());

  RETURN NEW;
END;
$$;

-- Backfill: give every existing user any of the above categories they don't
-- already have (matched by name, per user, per type). Rows that already
-- exist (e.g. the original 12 starter categories) are left alone.
INSERT INTO public."Category" (id, "userId", type, name, icon, color, "isSystemDefault", "updatedAt")
SELECT gen_random_uuid()::text, p.id, v.type::"CategoryType", v.name, v.icon, v.color, true, now()
FROM public."Profile" p
CROSS JOIN (VALUES
  ('EXPENSE', 'Groceries', '🛒', '#22c55e'),
  ('EXPENSE', 'Eating Out', '🍽️', '#f97316'),
  ('EXPENSE', 'Shopping', '🛍️', '#ec4899'),
  ('EXPENSE', 'Rent', '🏠', '#8b5cf6'),
  ('EXPENSE', 'Bills & Utilities', '💡', '#eab308'),
  ('EXPENSE', 'Transportation', '🚗', '#3b82f6'),
  ('EXPENSE', 'Health', '💊', '#ef4444'),
  ('EXPENSE', 'Entertainment', '🎬', '#6366f1'),
  ('EXPENSE', 'Travel', '✈️', '#06b6d4'),
  ('EXPENSE', 'Education', '📚', '#a855f7'),
  ('EXPENSE', 'Pets', '🐾', '#f59e0b'),
  ('EXPENSE', 'Home Maintenance', '🔧', '#64748b'),
  ('EXPENSE', 'Subscriptions', '📱', '#0ea5e9'),
  ('EXPENSE', 'Gifts & Donations', '🎁', '#d946ef'),
  ('EXPENSE', 'Other', '❓', '#71717a'),
  ('INCOME', 'Salary', '💼', '#16a34a'),
  ('INCOME', 'Business', '🏢', '#0ea5e9'),
  ('INCOME', 'Gifts', '🎁', '#d946ef'),
  ('INCOME', 'Interest', '📈', '#14b8a6'),
  ('INCOME', 'Rental Income', '🏠', '#8b5cf6'),
  ('INCOME', 'Other Income', '❓', '#71717a')
) AS v(type, name, icon, color)
ON CONFLICT ("userId", "type", "name") DO NOTHING;
