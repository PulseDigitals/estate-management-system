import LoginForm from "../../components/LoginForm";

export default function AdminLogin() {
  return (
    <div className="min-h-screen flex justify-center items-center bg-gray-100 p-6">
      <LoginForm role="admin" />
    </div>
  );
}

