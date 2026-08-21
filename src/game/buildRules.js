import { cardValue, isNumericCard } from './cardUtils'

export function isValidBuild({ playedCard, selectedCards, hand }) {
  if (!isNumericCard(playedCard) || !selectedCards.length || selectedCards.some((card) => !isNumericCard(card))) return false
  const total = cardValue(playedCard) + selectedCards.reduce((sum, card) => sum + cardValue(card), 0)
  return hand.some((card) => card.id !== playedCard.id && cardValue(card) === total)
}
