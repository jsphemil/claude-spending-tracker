-- Extends the signup trigger to also seed a starter set of categories for
-- every new user, alongside their Profile row (spec 5.3: "A starter set of
-- common categories will be created automatically for new users").
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
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Shopping', '🛍️', '#ec4899', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Eating Out', '🍽️', '#f97316', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Travel', '✈️', '#06b6d4', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Rent', '🏠', '#8b5cf6', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Groceries', '🛒', '#22c55e', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Bills & Utilities', '💡', '#eab308', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Entertainment', '🎬', '#6366f1', true, now()),
    (gen_random_uuid()::text, NEW.id, 'EXPENSE', 'Health', '💊', '#ef4444', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Salary', '💼', '#16a34a', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Business', '🏢', '#0ea5e9', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Gifts', '🎁', '#d946ef', true, now()),
    (gen_random_uuid()::text, NEW.id, 'INCOME', 'Interest', '📈', '#14b8a6', true, now());

  RETURN NEW;
END;
$$;
