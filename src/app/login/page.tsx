import LoginClient from '@/app/login/LoginClient'

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function getFirst(value: string | string[] | undefined) {
  if (!value) return ''
  return Array.isArray(value) ? value[0] || '' : value
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const nextPath = getFirst(params.next) || '/'
  const errorCode = getFirst(params.error)

  return (
    <LoginClient
      nextPath={nextPath}
      errorCode={errorCode}
    />
  )
}
