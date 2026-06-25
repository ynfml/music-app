/**
 * View Transitions API を安全に実行し、
 * 開発環境などで "Transition was skipped" (AbortError) が例外としてスローされるのを防ぎます。
 */
export function safeStartViewTransition(updateDOM: () => void) {
  if (typeof document !== "undefined" && document.startViewTransition) {
    const transition = document.startViewTransition(updateDOM);
    
    // プロミスの拒否（AbortError）を安全にキャッチして無視します
    transition.ready.catch(() => {});
    transition.updateCallbackDone.catch(() => {});
    transition.finished.catch(() => {});
    
    return transition;
  } else {
    updateDOM();
    return null;
  }
}
