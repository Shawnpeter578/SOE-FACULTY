import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-bold">
          Access denied
        </h1>

        <p className="text-gray-500">
          You do not have permission to access this resource.
          Contact the administrator if you believe this is an error.
        </p>

        <Link
          href="/login"
          className="inline-block bg-[#182855] text-white px-5 py-3 rounded-lg"
        >
          Return to login
        </Link>
      </div>
    </main>
  );
}