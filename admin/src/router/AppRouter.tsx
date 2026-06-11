import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { buildRoutes } from './routeConfig';
import { LoadingScreen } from '@/components/loading/LoadingScreen';

// Create router from configuration
const router = createBrowserRouter(buildRoutes());

export const AppRouter = () => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RouterProvider router={router} />
    </Suspense>
  );
};
