import { CardInstance } from '../data/cards';
import { SynergyData, ALL_SYNERGIES } from '../data/synergies';
import { Element } from '../utils/constants';

export class SynergySystem {
  private activeSynergies: SynergyData[] = [];

  calculateActiveSynergies(deck: CardInstance[]): void {
    // Count cards by element
    const elementCounts: Record<string, number> = {};
    for (const card of deck) {
      const el = card.data.element;
      if (el === 'neutral') continue;
      elementCounts[el] = (elementCounts[el] || 0) + 1;
    }

    this.activeSynergies = [];

    for (const synergy of ALL_SYNERGIES) {
      if (synergy.elements.length === 1) {
        // Single element synergy
        const count = elementCounts[synergy.elements[0]] || 0;
        if (count >= synergy.requiredCount) {
          this.activeSynergies.push(synergy);
        }
      } else {
        // Cross-element synergy: total cards of all specified elements
        let total = 0;
        for (const el of synergy.elements) {
          total += elementCounts[el] || 0;
        }
        // Also require at least 1 card of each element
        const hasAll = synergy.elements.every(el => (elementCounts[el] || 0) >= 1);
        if (hasAll && total >= synergy.requiredCount) {
          this.activeSynergies.push(synergy);
        }
      }
    }
  }

  getActiveSynergies(): SynergyData[] {
    return this.activeSynergies;
  }

  getElementCounts(deck: CardInstance[]): Record<Element, number> {
    const counts: Record<string, number> = {
      fire: 0, ice: 0, lightning: 0, nature: 0, dark: 0, neutral: 0,
    };
    for (const card of deck) {
      counts[card.data.element]++;
    }
    return counts as Record<Element, number>;
  }

  getPotentialSynergies(deck: CardInstance[]): SynergyData[] {
    const elementCounts: Record<string, number> = {};
    for (const card of deck) {
      if (card.data.element === 'neutral') continue;
      elementCounts[card.data.element] = (elementCounts[card.data.element] || 0) + 1;
    }

    const potential: SynergyData[] = [];
    for (const synergy of ALL_SYNERGIES) {
      if (this.activeSynergies.includes(synergy)) continue;

      if (synergy.elements.length === 1) {
        const count = elementCounts[synergy.elements[0]] || 0;
        const needed = synergy.requiredCount - count;
        if (needed > 0 && needed <= 2) {
          potential.push(synergy);
        }
      } else {
        let total = 0;
        for (const el of synergy.elements) {
          total += elementCounts[el] || 0;
        }
        const needed = synergy.requiredCount - total;
        if (needed > 0 && needed <= 2) {
          potential.push(synergy);
        }
      }
    }
    return potential;
  }
}
