import { AppLayout } from "@/components/layouts/app-layout"

export default async function MainAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AppLayout navItems={[{ label: 'Apps', href: '/apps' }]}>
      {children}
    </AppLayout>
  )
}