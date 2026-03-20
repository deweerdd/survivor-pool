export default function Spinner({ text }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </div>
  );
}
