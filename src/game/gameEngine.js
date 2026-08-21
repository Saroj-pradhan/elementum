import { createDeck, dealRound } from './deck'
import { teamForSeat } from './cardUtils'
import { legalCaptures } from './captureRules'
import { isValidBuild } from './buildRules'
import { cardValue } from './cardUtils'

export const TARGET_SCORE = 21

export function createGame(playerNames = ['Player 1', 'Player 2', 'Player 3', 'Player 4']) {
  const { tableCards, hands } = dealRound(createDeck())
  return { status: 'active', roundNumber: 1, targetScore: TARGET_SCORE, currentPlayer: 0, players: playerNames.map((name, seat) => ({ id: `player-${seat + 1}`, name, seat, team: teamForSeat(seat), hand: hands[seat], captured: [] })), tableCards, builds: [], lastCapturingPlayer: null, scores: { 1: 0, 2: 0 }, sweeps: { 1: 0, 2: 0 }, history: [] }
}

export function getLegalMoves(game, seat, cardId) {
  if (game.status !== 'active' || game.currentPlayer !== seat) return []
  const player = game.players[seat]
  const card = player.hand.find((item) => item.id === cardId)
  return card ? legalCaptures(card, game.tableCards, game.builds, player.team) : []
}

export function applyMove(game, seat, { type, cardId, targetIds = [], buildId }) {
  if (game.status !== 'active' || game.currentPlayer !== seat) throw new Error("That's not your turn.")
  const player = game.players[seat]
  const playedCard = player.hand.find((card) => card.id === cardId)
  if (!playedCard) throw new Error("You don't have that card.")
  const next = structuredClone(game)
  const nextPlayer = next.players[seat]
  nextPlayer.hand = nextPlayer.hand.filter((card) => card.id !== cardId)
  if (type === 'trail') next.tableCards.push(playedCard)
  else if (type === 'capture') {
    const legal = getLegalMoves(game, seat, cardId)
    const option = legal.find((move) => move.buildId === buildId || (!move.buildId && move.cardIds.length === targetIds.length && move.cardIds.every((id) => targetIds.includes(id))))
    if (!option) throw new Error('That capture is not legal.')
    let captured
    if (option.buildId) {
      const build = next.builds.find((item) => item.id === option.buildId)
      captured = build.cards
      next.builds = next.builds.filter((item) => item.id !== option.buildId)
    } else {
      captured = next.tableCards.filter((card) => targetIds.includes(card.id))
      next.tableCards = next.tableCards.filter((card) => !targetIds.includes(card.id))
    }
    nextPlayer.captured.push(playedCard, ...captured)
    next.lastCapturingPlayer = seat
    if (!next.tableCards.length && !next.builds.length) next.sweeps[nextPlayer.team] += 1
  } else if (type === 'build') {
    const selectedCards = game.tableCards.filter((card) => targetIds.includes(card.id))
    if (selectedCards.length !== targetIds.length || !isValidBuild({ playedCard, selectedCards, hand: player.hand })) throw new Error('That build is not legal. You must retain the matching capture card.')
    const value = cardValue(playedCard) + selectedCards.reduce((sum, card) => sum + cardValue(card), 0)
    next.tableCards = next.tableCards.filter((card) => !targetIds.includes(card.id))
    next.builds.push({ id: `build-${Date.now()}`, ownerPlayer: player.id, ownerTeam: player.team, value, requiredCapturingRank: String(value), cards: [playedCard, ...selectedCards] })
  } else throw new Error('Unsupported move.')
  next.history.push({ player: player.id, action: type.toUpperCase(), card: cardId, targets: targetIds, at: Date.now() })
  next.currentPlayer = (seat + 1) % 4
  return next
}
