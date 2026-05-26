import { AuthSplit } from "@/components/auth/AuthSplit";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthSplit>
      <LoginForm />
    </AuthSplit>
  );
}
