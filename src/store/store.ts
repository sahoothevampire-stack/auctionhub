import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { combineReducers } from 'redux';
import { useDispatch, type TypedUseSelectorHook, useSelector } from 'react-redux';

import listingsReducer from './listingsSlice';
import filtersReducer from './filtersSlice';
import authReducer from './authSlice';
import kycReducer from './kycSlice';

/*
  On Next.js projects (and other SSR environments) importing the default
  storage from 'redux-persist/lib/storage' will attempt to access
  `window.localStorage` during module initialization which is not
  available on the server. That triggers the message:
    "redux-persist failed to create sync storage. falling back to noop storage."

  To avoid that, we choose storage at runtime: use the real localStorage-based
  storage only when `window` is available (client). On the server we provide
  a minimal async noop storage that implements the same async methods.
*/

// Minimal async noop storage compatible with redux-persist
const createNoopStorage = () => ({
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
});

let storage: any;
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  storage = require('redux-persist/lib/storage').default;
} else {
  storage = createNoopStorage();
}

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['listings', 'auth', 'kyc'], // persist listings, auth, and kyc status
};

const rootReducer = combineReducers({
  listings: listingsReducer,
  filters: filtersReducer,
  auth: authReducer,
  kyc: kycReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;