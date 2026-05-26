import { configureStore } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER,
} from "redux-persist";
import rootReducer, { RootReducerState } from "./rootReducer";

import createWebStorage from "redux-persist/lib/storage/createWebStorage";

// createWebStorage("local") uses localStorage on the client. On the server
// (SSR / Node.js) localStorage doesn't exist, so we return a no-op that
// fulfils the same interface — silences the redux-persist fallback warning.
const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : {
        getItem:    (_key: string) => Promise.resolve(null),
        setItem:    (_key: string, _value: string) => Promise.resolve(),
        removeItem: (_key: string) => Promise.resolve(),
      };

const persistConfig = {
  key: "edupath",
  storage,
  whitelist: ["session"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = RootReducerState;
export type AppDispatch = typeof store.dispatch;
