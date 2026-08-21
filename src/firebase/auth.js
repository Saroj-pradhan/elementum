import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { firebaseApp, firebaseEnabled } from './config'

export async function ensureAnonymousUser() {
  if (!firebaseEnabled) throw new Error('Firebase is not configured yet.')
  const auth = getAuth(firebaseApp)
  if (auth.currentUser) return auth.currentUser
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe()
      if (user) resolve(user)
      else { try { resolve((await signInAnonymously(auth)).user) } catch (error) { reject(error) } }
    })
  })
}
