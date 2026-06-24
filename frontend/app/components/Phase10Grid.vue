<template>
  <div class="t-surface border t-border rounded-xl overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-xs">
        <thead>
          <tr class="border-b t-border">
            <th class="px-3 py-2.5 text-left font-medium t-text-muted whitespace-nowrap">Spieler</th>
            <th
              v-for="n in 10"
              :key="n"
              class="px-2 py-2.5 text-center font-medium t-text-muted whitespace-nowrap w-8"
            >
              {{ n }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="player in players" :key="player.userId" class="border-b t-border last:border-b-0">
            <td class="px-3 py-2 font-medium t-text whitespace-nowrap text-xs">{{ player.displayName }}</td>
            <td v-for="n in 10" :key="n" class="px-1 py-1 text-center">
              <button
                class="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                :class="isPhaseCompleted(player.userId, n)
                  ? 'bg-green-500/20 text-green-400'
                  : 'hover:bg-white/5 t-text-muted'"
                :disabled="!canEdit(player.userId)"
                @click="togglePhase(player.userId, n)"
              >
                <svg v-if="isPhaseCompleted(player.userId, n)" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                </svg>
                <span v-else class="text-[10px]">·</span>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GamePlayer, Phase10Phase } from '@shared/types/game'

const props = defineProps<{
  players: GamePlayer[]
  phases: Phase10Phase[]
  isCreator: boolean
  currentUserId: string
}>()

const emit = defineEmits<{
  phaseToggle: [userId: string, phaseNumber: number, completed: boolean]
}>()

function isPhaseCompleted(userId: string, phaseNumber: number): boolean {
  return props.phases.some(p => p.userId === userId && p.phaseNumber === phaseNumber && p.completed)
}

function canEdit(playerId: string): boolean {
  return props.isCreator || playerId === props.currentUserId
}

function togglePhase(userId: string, phaseNumber: number) {
  const current = isPhaseCompleted(userId, phaseNumber)
  emit('phaseToggle', userId, phaseNumber, !current)
}
</script>
