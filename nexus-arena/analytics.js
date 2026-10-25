import {inject} from '@vercel/analytics';

// Vite exposes the environment explicitly; local development does not record visits.
inject({mode:import.meta.env.DEV?'development':'production'});
