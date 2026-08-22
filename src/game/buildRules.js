import { cardValue, isNumericCard } from './cardUtils'

export function isValidBuild({ playedCard, selectedCards, hand }) {
  if (!isNumericCard(playedCard) || !selectedCards.length || selectedCards.some((card) => !isNumericCard(card))) return false
  const total = cardValue(playedCard) + selectedCards.reduce((sum, card) => sum + cardValue(card), 0)
  return hand.some((card) => card.id !== playedCard.id && cardValue(card) === total)
}

export function buildValue(playedCard, selectedCards) {
  return cardValue(playedCard) + selectedCards.reduce((sum, card) => sum + cardValue(card), 0)
}

export function buildDetails(playedCard, selectedCards, hand, playerId, team) {
  if (!isValidBuild({ playedCard, selectedCards, hand })) return null
  const value = buildValue(playedCard, selectedCards)
  return {
    id: `build-${playedCard.id}-${Date.now()}`,
    ownerPlayerId: playerId,
    team,
    cards: [playedCard, ...selectedCards],
    buildValue: value,
    value,
    requiredCaptureRank: String(value),
  }
}
