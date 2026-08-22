import { cardValue, isNumericCard } from './cardUtils'

export function findCombinations(cards, target) {
  const results = []
  function visit(start, picked, total) {
    if (total === target && picked.length) { results.push(picked); return }
    if (total >= target) return
    for (let index = start; index < cards.length; index += 1) {
      const card = cards[index]
      if (!isNumericCard(card)) continue
      visit(index + 1, [...picked, card], total + cardValue(card))
    }
  }
  visit(0, [], 0)
  return results
}

const sameIds = (left, right) => left.length === right.length && left.every((id) => right.includes(id))

export function legalCaptures(card, tableCards = [], builds = [], team) {
  const options = tableCards.filter((tableCard) => tableCard.rank === card.rank).map((tableCard) => ({ type: 'match', cardIds: [tableCard.id] }))
  if (isNumericCard(card)) {
    findCombinations(tableCards, cardValue(card)).filter((set) => set.length > 1).forEach((set) => options.push({ type: 'combine', cardIds: set.map((item) => item.id) }))
    builds.filter((build) => Number(build.buildValue ?? build.value) === cardValue(card) && (build.team ?? build.ownerTeam) === team).forEach((build) => options.push({ type: 'build', buildId: build.id, cardIds: [] }))
  }
  return options
}

export function isLegalCapture(card, targetIds, tableCards, builds, team, buildId) {
  return legalCaptures(card, tableCards, builds, team).some((move) => move.buildId === buildId || (!move.buildId && sameIds(move.cardIds, targetIds)))
}
