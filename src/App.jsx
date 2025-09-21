// src/App.jsx
import AuthGate from "./AuthGate";
import CoupleDiary from "./CoupleDiary";

export default function App() {
  return (
    <AuthGate>
      <CoupleDiary />
    </AuthGate>
  );
}
