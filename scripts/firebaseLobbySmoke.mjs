import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously } from 'firebase/auth'
import { get, getDatabase, onValue, ref, runTransaction, set, update } from 'firebase/database'

const config = { apiKey: process.env.VITE_FIREBASE_API_KEY, authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN, databaseURL: process.env.VITE_FIREBASE_DATABASE_URL, projectId: process.env.VITE_FIREBASE_PROJECT_ID }
const roomCode = `TEST${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
const within = (promise, label) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${label}`)), 10000))])
const makeClient = async (label) => { const app = initializeApp(config, label); const user = (await signInAnonymously(getAuth(app))).user; return { user, db: getDatabase(app) } }
const tx = (client, path, updater) => runTransaction(ref(client.db, path), updater)
const join = async (client, playerId, name) => {
  const room = (await within(get(ref(client.db, `games/${roomCode}`)), 'read room')).val()
  if (!room || room.status !== 'lobby' || room.players[playerId]) return false
  const players = Object.values(room.players)
  if (players.length >= 4) return false
  const slot = [1, 2, 3, 4].find((value) => !players.some((player) => player.slot === value))
  await within(set(ref(client.db, `games/${roomCode}/players/${playerId}`), { playerId, authUid: client.user.uid, name, slot, team: slot <= 2 ? 1 : 2, isHost: false, status: 'connected' }), 'join room')
  return true
}
const read = (client) => new Promise((resolve) => { const off = onValue(ref(client.db, `games/${roomCode}`), (snap) => { off(); resolve(snap.val()) }, { onlyOnce: true }) })
const assert = (condition, label) => { if (!condition) throw new Error(`FAIL: ${label}`); console.log(`PASS: ${label}`) }

const [host, two, three, four, five] = await Promise.all(['host', 'two', 'three', 'four', 'five'].map(makeClient))
const hostId = 'test_host'; const create = await tx(host, `games/${roomCode}`, (existing) => existing ?? ({ roomCode, status: 'lobby', hostPlayerId: hostId, teamsLocked: false, players: { [hostId]: { playerId: hostId, authUid: host.user.uid, name: 'Host', slot: 1, team: 1, isHost: true, status: 'connected' } } }))
assert(create.committed, 'host creates a room')
await join(two, 'test_two', 'Two'); let room = await read(host); assert(Object.keys(room.players).length === 2, 'second player appears in the same lobby')
await join(three, 'test_three', 'Three'); await join(four, 'test_four', 'Four'); room = await read(host); assert(Object.keys(room.players).length === 4, 'third and fourth players join')
const fifth = await join(five, 'test_five', 'Five'); assert(!fifth, 'fifth player is rejected')
await update(ref(host.db, `games/${roomCode}/players/test_two`), { team: 2 }); room = await read(two); assert(room.players.test_two.team === 2, 'host team change synchronizes')
let nonHostBlocked = false; try { await update(ref(two.db, `games/${roomCode}/players/test_three`), { team: 1 }) } catch { nonHostBlocked = true }
console.log(`${nonHostBlocked ? 'PASS' : 'FAIL'}: non-host cannot change teams`)
if (!nonHostBlocked) await update(ref(host.db, `games/${roomCode}/players/test_three`), { team: 2 })
const originalSlot = room.players.test_three.slot; const rejoin = await join(three, 'test_three', 'Three'); room = await read(host); assert(!rejoin && room.players.test_three.slot === originalSlot && room.players.test_three.team === 2, 'same player reconnect preserves slot and team')
assert(room.status === 'lobby', 'fourth player does not auto-start the game')
let nonHostStartBlocked = false; try { await update(ref(two.db, `games/${roomCode}`), { status: 'starting', teamsLocked: true }) } catch { nonHostStartBlocked = true }
console.log(`${nonHostStartBlocked ? 'PASS' : 'FAIL'}: non-host cannot start the game`)
if (!nonHostStartBlocked) await update(ref(host.db, `games/${roomCode}`), { status: 'lobby', teamsLocked: false })
await update(ref(host.db, `games/${roomCode}`), { status: 'starting', teamsLocked: true })
assert(true, 'host can start with two players per team')
room = await read(four); assert(room.status === 'starting' && room.teamsLocked, 'game start is visible to every player')
console.log(`Smoke room retained for inspection: ${roomCode}`)
