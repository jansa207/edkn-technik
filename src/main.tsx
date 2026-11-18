import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { queryClient } from '@/app/queryClient'
import { routes } from '@/app/routes'
import './index.css'

const router = createBrowserRouter(routes)

const root = document.getElementById('root')
if (!root) throw new Error('Element #root fehlt in index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
