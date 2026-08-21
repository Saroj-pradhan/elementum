const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function createRoomCode() {
  const bytes = crypto.getRandomValues(new Uint32Array(6))
  return [...bytes].map((value) => ALPHABET[value % ALPHABET.length]).join('')
}
export function getPlayerId() {
  const key = 'casino_player_id'
  let playerId = localStorage.getItem(key)
  if (!playerId) { playerId = `player_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`; localStorage.setItem(key, playerId) }
  return playerId
}
