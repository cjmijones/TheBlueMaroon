// src/components/EmptyState.tsx
export default function EmptyState({ title, body }: { title: string; body?: string }) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-800">
        <p className="text-lg font-medium text-gray-800 dark:text-white">{title}</p>
        {body && <p className="mt-2 max-w-xs text-sm text-gray-500 dark:text-gray-400">{body}</p>}
      </div>
    );
  }
  