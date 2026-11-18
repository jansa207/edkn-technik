import { isRouteErrorResponse, useRouteError } from 'react-router'

export function ErrorPage() {
  const error = useRouteError()
  const text = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unbekannter Fehler'

  return (
    <div className="mx-auto max-w-lg space-y-4 px-4 py-10">
      <h1 className="text-2xl font-semibold">Da ist etwas schiefgelaufen</h1>
      <p className="text-text-2">{text}</p>
      <a
        href="/"
        className="bg-primaer inline-flex min-h-12 items-center rounded-md px-5 font-semibold text-white"
      >
        Neu laden
      </a>
    </div>
  )
}
