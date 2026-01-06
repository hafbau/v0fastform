import { redirect } from "next/navigation"
import { auth } from "../auth"
import { AuthForm } from "@/components/auth-form"
import { AuthLayout } from "@/components/auth-layout"

export default async function LoginPage() {
  const session = await auth()

  if (session) {
    redirect("/")
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue building amazing forms.">
      <AuthForm type="signin" />
    </AuthLayout>
  )
}
