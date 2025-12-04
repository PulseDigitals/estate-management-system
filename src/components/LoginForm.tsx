import type { FormEvent } from "react";

type Props = {
  role: "accountant" | "admin" | "resident" | "security";
};

export default function LoginForm({ role }: Props) {
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // Use Replit/oidc auth: redirect to server login endpoint with role hint
    window.location.href = `/api/login?role=${encodeURIComponent(role)}`;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-xl shadow-md w-full max-w-md"
    >
      <h2 className="text-2xl font-bold mb-4 capitalize">
        {role} login
      </h2>

      <p className="text-sm text-gray-600 mb-6">
        You’ll be redirected to the secure sign-in page to authenticate as{" "}
        <strong>{role}</strong>.
      </p>

      <button
        type="submit"
        className="w-full py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Continue to sign in
      </button>
    </form>
  );
}
