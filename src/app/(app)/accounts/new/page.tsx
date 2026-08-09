import { AccountForm } from "@/components/accounts/AccountForm";
import { createAccount } from "@/lib/actions/accounts";

export default function NewAccountPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-zinc-900">New Account</h1>
      <div className="mt-6">
        <AccountForm action={createAccount} submitLabel="Create account" />
      </div>
    </div>
  );
}
