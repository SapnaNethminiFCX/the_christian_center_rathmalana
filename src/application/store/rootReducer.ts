import { combineReducers } from "@reduxjs/toolkit";
import uiReducer from "@/application/slices/uiSlice";
import sessionReducer from "@/application/slices/sessionSlice";
import localeReducer from "@/application/slices/localeSlice";

const rootReducer = combineReducers({
  ui: uiReducer,
  session: sessionReducer,
  locale: localeReducer,
});

export type RootReducerState = ReturnType<typeof rootReducer>;
export default rootReducer;
