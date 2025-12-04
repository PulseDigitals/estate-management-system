import { Link } from "react-router-dom";

export default function LoginIndex() {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-8">Sign in to Your Account</h1>

      <div className="grid gap-4 w-full max-w-sm">
        <Link
          to="/login/admin"
          className="px-4 py-3 bg-blue-600 text-white rounded-lg text-center hover:bg-blue-700"
        >
          Admin Login
        </Link>

        <Link
          to="/login/accountant"
          className="px-4 py-3 bg-green-600 text-white rounded-lg text-center hover:bg-green-700"
        >
          Accountant Login
        </Link>

        <Link
          to="/login/security"
          className="px-4 py-3 bg-yellow-600 text-white rounded-lg text-center hover:bg-yellow-700"
        >
          Security Login
        </Link>

        <Link
          to="/login/resident"
          className="px-4 py-3 bg-purple-600 text-white rounded-lg text-center hover:bg-purple-700"
        >
          Resident Login
        </Link>
      </div>
    </div>
  );
}
