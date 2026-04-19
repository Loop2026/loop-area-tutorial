// =====================================================
// Logica di stato moduli
// =====================================================
import type { ModuleRow, ModuleState, ModuleWithProgress, ProgressRow } from "./types";

/**
 * Calcola lo stato di ogni modulo per un utente.
 * - m1 è sempre disponibile
 * - un modulo è "available" se il precedente è "done"
 * - "in_progress" se watched_pct > 0 e < 100
 * - "completed" se done = true
 */
export function computeModuleStates(
  modules: ModuleRow[],
  progress: ProgressRow[]
): ModuleWithProgress[] {
  const progMap = new Map(progress.map((p) => [p.module_id, p]));
  const sorted = [...modules].sort((a, b) => a.order_index - b.order_index);

  let prevDone = true; // il primo modulo è sempre sbloccato
  return sorted.map((m) => {
    const p = progMap.get(m.id);
    let state: ModuleState;
    if (p?.done) state = "completed";
    else if (!prevDone) state = "locked";
    else if (p && p.watched_pct > 0) state = "in_progress";
    else state = "available";

    prevDone = !!p?.done;
    return { ...m, progress: p, state };
  });
}
