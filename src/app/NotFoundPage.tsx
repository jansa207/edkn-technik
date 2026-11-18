import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <Link
        to="/"
        className="bg-marine inline-flex min-h-12 items-center rounded-lg px-5 text-lg font-semibold text-white"
      >
        Zur Startseite
      </Link>
    </div>
  )
}
