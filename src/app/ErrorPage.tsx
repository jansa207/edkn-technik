import { isRouteErrorResponse, useRouteError } from 'react-router'

export function ErrorPage() {
  const error = useRouteError()
  const text = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'Unbekannter Fehler'

  return (
    <div className="mx-auto max-w-screen-sm space-y-4 px-4 py-10">
      <h1 className="text-2xl font-bold">Da ist etwas schiefgelaufen</h1>
      <p className="text-neutral-700">{text}</p>
      <a
        href="/"
        className="bg-marine inline-flex min-h-12 items-center rounded-lg px-5 text-lg font-semibold text-white"
      >
        Neu laden
      </a>
    </div>
  )
}
