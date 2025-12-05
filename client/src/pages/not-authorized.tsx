export default function NotAuthorized() {
  return (
    <div className="flex h-screen items-center justify-center flex-col">
      <h1 className="text-3xl font-bold text-red-600">Access Denied</h1>
      <p className="text-gray-600 mt-2">You do not have permission to access this page.</p>
    </div>
  );
}
