import { redirect } from "next/navigation"
import { auth } from "../auth"
import { AuthForm } from "@/components/auth-form"
import { AuthLayout } from "@/components/auth-layout"

export default async function RegisterPage() {
  const session = await auth()

  if (session) {
    redirect("/")
  }

  return (
    <AuthLayout title="Create your account" subtitle="Get started with FastForm and transform how you collect data.">
      <AuthForm type="signup" />
    </AuthLayout>
  )
}
