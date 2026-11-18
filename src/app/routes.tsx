import type { RouteObject } from 'react-router'
import { ErrorPage } from './ErrorPage'
import { HomePage } from './HomePage'
import { Layout } from './Layout'
import { NotFoundPage } from './NotFoundPage'

// Zentrale Routen. Guards (freigegeben? Rolle?) kommen in Schritt 3 dazu.
export const routes: RouteObject[] = [
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
