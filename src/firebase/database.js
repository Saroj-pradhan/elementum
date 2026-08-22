import { get, getDatabase, onValue, ref, runTransaction, set, update } from 'firebase/database'
import { firebaseApp, firebaseEnabled } from './config'
import { createRoomCode } from '../utils/roomCode'

const db = () => {
  if (!firebaseEnabled) throw new Error('Firebase is not configured. Add VITE_FIREBASE_DATABASE_URL to .env.')
  return getDatabase(firebaseApp)
}
const roomRef = (code) => ref(db(), `games/${code}`)

export function watchRoom(code, callback) {
  return onValue(roomRef(code), (snapshot) => callback(snapshot.val()))
}

export async function createRoom({ playerId, authUid, name }) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const roomCode = createRoomCode()
    const result = await runTransaction(roomRef(roomCode), (existing) => existing ?? ({
      roomCode, status: 'lobby', hostPlayerId: playerId, teamsLocked: false, createdAt: Date.now(),
      players: { [playerId]: { playerId, authUid, name: name.trim(), slot: 1, team: 1, isHost: true, status: 'connected' } },
    }))
    if (result.committed && result.snapshot.val()?.hostPlayerId === playerId) return roomCode
  }
  throw new Error('Could not create a unique room. Please try again.')
}

export async function joinRoom({ roomCode, playerId, authUid, name }) {
  const code = roomCode.trim().toUpperCase()
  const snapshot = await get(roomRef(code))
  const room = snapshot.val()
  if (!room || room.status !== 'lobby') throw new Error('Room not found or already started.')
  if (room.players?.[playerId]) return code
  const players = Object.values(room.players || {})
  if (players.length >= 4) throw new Error('Game is full.')
  const taken = new Set(players.map((player) => player.slot))
  const slot = [1, 2, 3, 4].find((value) => !taken.has(value))
  await set(ref(db(), `games/${code}/players/${playerId}`), { playerId, authUid, name: name.trim(), slot, team: slot <= 2 ? 1 : 2, isHost: false, status: 'connected' })
  return code
}

export async function setTeam({ roomCode, playerId, hostPlayerId, targetPlayerId, team }) {
  if (playerId !== hostPlayerId) throw new Error('Only the host can choose teams.')
  await update(ref(db(), `games/${roomCode}/players/${targetPlayerId}`), { team })
}

export async function startRoom({ roomCode, playerId }) {
  const snapshot = await get(roomRef(roomCode))
  const room = snapshot.val()
  const players = Object.values(room?.players || {})
    const counts = players.reduce((sum, player) => ({ ...sum, [player.team]: (sum[player.team] || 0) + 1 }), {})
  if (!room || room.hostPlayerId !== playerId || room.status !== 'lobby' || players.length !== 4 || counts[1] !== 2 || counts[2] !== 2) throw new Error('Need four players and exactly two players on each team.')
  await update(roomRef(roomCode), { status: 'starting', teamsLocked: true })
}
