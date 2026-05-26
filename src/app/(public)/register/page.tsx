import { AuthSplit } from "@/components/auth/AuthSplit";
import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthSplit variant="register">
      <RegisterForm />
    </AuthSplit>
  );
}
