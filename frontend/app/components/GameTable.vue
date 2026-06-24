<template>
  <div class="t-surface border t-border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b t-border">
            <th class="px-3 py-2.5 text-left font-medium t-text-muted whitespace-nowrap">#</th>
            <th
              v-for="player in players"
              :key="player.userId"
              class="px-3 py-2.5 text-center font-medium t-text-muted whitespace-nowrap min-w-[70px]"
            >
              {{ player.displayName }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="round in rounds" :key="round.id" class="border-b t-border">
            <td class="px-3 py-2 font-medium t-text-muted">{{ round.roundNumber }}</td>
            <td
              v-for="player in players"
              :key="player.userId"
              class="px-1 py-1 text-center"
            >
              <input
                v-if="canEdit(player.userId)"
                type="number"
                :value="getScore(round.id, player.userId)"
                class="w-full text-center text-xs py-1.5 px-1 rounded-md bg-transparent t-text focus:outline-none focus:ring-1"
                style="--tw-ring-color: var(--theme-primary)"
                @change="(e) => handleScoreChange(round.id, player.userId, e)"
              >
              <span v-else class="text-sm t-text tabular-nums">
                {{ getScore(round.id, player.userId) ?? '-' }}
              </span>
            </td>
          </tr>

          <!-- Totals row -->
          <tr v-if="rounds.length > 0" class="font-bold">
            <td class="px-3 py-2.5 t-text-muted">Σ</td>
            <td v-for="player in players" :key="player.userId" class="px-3 py-2.5 text-center t-text tabular-nums">
              {{ getTotal(player.userId) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GamePlayer, GameRound, GameScore } from '@shared/types/game'

const props = defineProps<{
  players: GamePlayer[]
  rounds: GameRound[]
  scores: GameScore[]
  isCreator: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  scoreChange: [roundId: string, userId: string, score: number]
}>()

function canEdit(playerId: string): boolean {
  return props.isCreator || playerId === props.currentUserId
}

function getScore(roundId: string, userId: string): number | null {
  const score = props.scores.find(s => s.roundId === roundId && s.userId === userId)
  return score?.score ?? null
}

function getTotal(userId: string): number {
  return props.scores
    .filter(s => s.userId === userId)
    .reduce((sum, s) => sum + s.score, 0)
}

function handleScoreChange(roundId: string, userId: string, e: Event) {
  const value = parseInt((e.target as HTMLInputElement).value)
  if (!isNaN(value)) {
    emit('scoreChange', roundId, userId, value)
  }
}
</script>
