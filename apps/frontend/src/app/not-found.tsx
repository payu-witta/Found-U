import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 className="text-6xl font-bold text-brand-700">404</h1>
      <p className="mt-2 text-lg text-gray-600">Page not found</p>
      <p className="mt-1 text-sm text-gray-400">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/feed"
        className="mt-6 rounded-lg bg-brand-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-brand-800"
      >
        Back to Feed
      </Link>
    </div>
  );
}
