import { get, getDatabase, onValue, ref, runTransaction, set, update } from 'firebase/database'
import { firebaseApp, firebaseEnabled } from './config'
import { createRoomCode } from '../utils/roomCode'
import { createDeck, dealRound } from '../game/deck'
import { legalCaptures } from '../game/captureRules'
import { isValidBuild } from '../game/buildRules'
import { cardValue } from '../game/cardUtils'

const db = () => {
  if (!firebaseEnabled) throw new Error('Firebase is not configured. Add VITE_FIREBASE_DATABASE_URL to .env.')
  return getDatabase(firebaseApp)
}
const roomRef = (code) => ref(db(), `games/${code}`)

export function watchRoom(code, callback) {
  return onValue(roomRef(code), (snapshot) => callback(snapshot.val()))
}

export function watchPrivateGame(roomCode, playerId, callback) {
  return onValue(ref(db(), `private/${roomCode}/${playerId}`), (snapshot) => callback(snapshot.val()))
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
  const { tableCards, hands } = dealRound(createDeck())
  const seatedPlayers = [...players].sort((left, right) => left.slot - right.slot)
  const publicPlayers = Object.fromEntries(seatedPlayers.map((player) => [player.playerId, { playerId: player.playerId, name: player.name, slot: player.slot, team: player.team, handCount: 12, capturedCount: 0 }]))
  const writes = {
    [`games/${roomCode}/status`]: 'playing',
    [`games/${roomCode}/teamsLocked`]: true,
    [`games/${roomCode}/game`]: { roundNumber: 1, targetScore: 21, currentSlot: 1, tableCards, builds: {}, scores: { 1: 0, 2: 0 }, sweeps: { 1: 0, 2: 0 }, lastCapturingPlayer: null, players: publicPlayers },
  }
  seatedPlayers.forEach((player, index) => { writes[`private/${roomCode}/${player.playerId}`] = { hand: hands[index], capturedCards: [] } })
  await update(ref(db()), writes)
}

export async function playMove({ roomCode, playerId, type, cardId, targetIds = [], buildId }) {
  const [roomSnapshot, privateSnapshot] = await Promise.all([get(roomRef(roomCode)), get(ref(db(), `private/${roomCode}/${playerId}`))])
  const room = roomSnapshot.val(); const game = room?.game; const privateState = privateSnapshot.val()
  const player = game?.players?.[playerId]
  if (!game || !player || !privateState || room.status !== 'playing') throw new Error('Game is not ready yet.')
  if (game.currentSlot !== player.slot) throw new Error("That's not your turn.")
  const playedCard = privateState.hand?.find((card) => card.id === cardId)
  if (!playedCard) throw new Error("You don't have that card.")
  const tableCards = [...(game.tableCards || [])]; let builds = Object.values(game.builds || {}); const nextHand = privateState.hand.filter((card) => card.id !== cardId); const captured = [...(privateState.capturedCards || [])]
  if (type === 'trail') tableCards.push(playedCard)
  else if (type === 'capture') {
    const option = legalCaptures(playedCard, tableCards, builds, player.team).find((move) => move.buildId === buildId || (!move.buildId && move.cardIds.length === targetIds.length && move.cardIds.every((id) => targetIds.includes(id))))
    if (!option) throw new Error("That capture isn't legal.")
    if (option.buildId) { const build = builds.find((item) => item.id === option.buildId); captured.push(playedCard, ...build.cards); builds = builds.filter((item) => item.id !== option.buildId) }
    else { const cards = tableCards.filter((card) => targetIds.includes(card.id)); captured.push(playedCard, ...cards); targetIds.forEach((id) => { const index = tableCards.findIndex((card) => card.id === id); if (index >= 0) tableCards.splice(index, 1) }) }
  } else if (type === 'build') {
    const selectedCards = tableCards.filter((card) => targetIds.includes(card.id))
    if (selectedCards.length !== targetIds.length || !isValidBuild({ playedCard, selectedCards, hand: privateState.hand })) throw new Error("That build isn't legal. Keep a matching capture card in your hand.")
    const value = cardValue(playedCard) + selectedCards.reduce((sum, card) => sum + cardValue(card), 0)
    targetIds.forEach((id) => { const index = tableCards.findIndex((card) => card.id === id); if (index >= 0) tableCards.splice(index, 1) })
    builds.push({ id: `build-${Date.now()}`, ownerPlayerId: playerId, team: player.team, cards: [playedCard, ...selectedCards], value, requiredCaptureRank: String(value) })
  } else throw new Error('Unsupported move.')
  const nextSlot = game.currentSlot === 4 ? 1 : game.currentSlot + 1
  const writes = { [`games/${roomCode}/game/tableCards`]: tableCards, [`games/${roomCode}/game/builds`]: Object.fromEntries(builds.map((build) => [build.id, build])), [`games/${roomCode}/game/currentSlot`]: nextSlot, [`games/${roomCode}/game/players/${playerId}/handCount`]: nextHand.length, [`games/${roomCode}/game/players/${playerId}/capturedCount`]: captured.length, [`private/${roomCode}/${playerId}/hand`]: nextHand, [`private/${roomCode}/${playerId}/capturedCards`]: captured }
  if (type === 'capture') { writes[`games/${roomCode}/game/lastCapturingPlayer`] = playerId; if (!tableCards.length && !builds.length) writes[`games/${roomCode}/game/sweeps/${player.team}`] = (game.sweeps?.[player.team] || 0) + 1 }
  await update(ref(db()), writes)
}
