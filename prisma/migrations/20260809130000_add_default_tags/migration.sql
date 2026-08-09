-- Mirrors the default-category mechanism (see 20260809120000) for tags:
-- every user gets a standard starter set of tags they can use immediately,
-- on top of which they can freely create their own private ones. Default
-- tags are per-user rows (not shared/global) so each user can rename or
-- delete theirs independently — "isSystemDefault" just marks provenance.

ALTER TABLE "Tag" ADD COLUMN "isSystemDefault" BOOLEAN NOT NULL DEFAULT false;

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

  INSERT INTO public."Tag" (id, "userId", name, "isSystemDefault")
  VALUES
    (gen_random_uuid()::text, NEW.id, 'Personal', true),
    (gen_random_uuid()::text, NEW.id, 'Work', true),
    (gen_random_uuid()::text, NEW.id, 'Family', true),
    (gen_random_uuid()::text, NEW.id, 'Shared Expense', true),
    (gen_random_uuid()::text, NEW.id, 'Reimbursable', true),
    (gen_random_uuid()::text, NEW.id, 'Emergency', true),
    (gen_random_uuid()::text, NEW.id, 'Gift', true),
    (gen_random_uuid()::text, NEW.id, 'Recurring', true);

  RETURN NEW;
END;
$$;

-- Backfill the default tags onto existing users (their own private rows,
-- skipped where a same-named tag already exists for that user).
INSERT INTO public."Tag" (id, "userId", name, "isSystemDefault")
SELECT gen_random_uuid()::text, p.id, v.name, true
FROM public."Profile" p
CROSS JOIN (VALUES
  ('Personal'),
  ('Work'),
  ('Family'),
  ('Shared Expense'),
  ('Reimbursable'),
  ('Emergency'),
  ('Gift'),
  ('Recurring')
) AS v(name)
ON CONFLICT ("userId", "name") DO NOTHING;
