import { initializeApp, getApps } from 'firebase/app'

const databaseUrl = import.meta.env.VITE_FIREBASE_DATABASE_URL?.trim()
const databaseRootUrl = databaseUrl ? new URL(databaseUrl).origin : ''
const config = { apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, databaseURL: databaseRootUrl, projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID }
export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.databaseURL)
export const firebaseApp = firebaseEnabled ? (getApps()[0] ?? initializeApp(config)) : null
