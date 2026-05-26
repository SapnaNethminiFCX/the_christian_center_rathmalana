import { getAuth } from "firebase/auth";
import { firebaseApp } from "./firebaseConfig";

export const auth = getAuth(firebaseApp);
