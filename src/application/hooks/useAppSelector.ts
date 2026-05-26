import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState } from "@/application/store";

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
