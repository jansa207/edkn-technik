import { ButtonLink } from '@/components/Button'

export function NotFoundPage() {
  return (
    <div className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold">Seite nicht gefunden</h1>
      <ButtonLink to="/" art="primaer">
        Zur Startseite
      </ButtonLink>
    </div>
  )
}
