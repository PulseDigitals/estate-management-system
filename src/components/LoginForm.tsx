import type { FormEvent } from "react";

type Props = {
  role: "accountant" | "admin" | "resident" | "security";
};

export default function LoginForm({ role }: Props) {
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include", // required to send session cookie
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${role}@demo.local`, // change when your form collects email
        password: "password", // replace when your UI supports password input
        role,
      }),
    });

    if (res.ok) {
      window.location.href = "/";
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Authentication failed");
    }
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
        You will be redirected to the secure sign-in page to authenticate as{" "}
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