import { useEffect, useState, useContext, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { googleLogin } = useContext(AuthContext);
  const [status, setStatus] = useState("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const code = searchParams.get("code");
    const credential = searchParams.get("credential");
    const error = searchParams.get("error");

    if (error) {
      setStatus("error");
      setErrorMsg(`Google Authentication was cancelled or denied: ${error}`);
      return;
    }

    if (!code && !credential) {
      setStatus("error");
      setErrorMsg("No authorization code or identity token received from Google.");
      return;
    }

    const exchangeToken = async () => {
      try {
        const payload = code ? { code } : { credential };
        const data = await googleLogin(payload);
        setStatus("success");
        setTimeout(() => {
          if (data.user?.role === "patient") {
            navigate("/patient/dashboard");
          } else if (data.user?.role === "doctor") {
            navigate("/doctor/dashboard");
          } else if (data.user?.role === "admin") {
            navigate("/admin/dashboard");
          } else {
            navigate("/home");
          }
        }, 1000);
      } catch (err) {
        setStatus("error");
        setErrorMsg(
          err.response?.data?.message ||
          err.message ||
          "Failed to verify Google authentication credentials."
        );
      }
    };

    exchangeToken();
  }, [searchParams, googleLogin, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 50%, #99f6e4 100%)",
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "460px",
          background: "rgba(255, 255, 255, 0.9)",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(13, 148, 136, 0.12)",
          border: "1px solid rgba(20, 184, 166, 0.2)",
          backdropFilter: "blur(12px)",
          padding: "36px 30px",
          textAlign: "center",
        }}
      >
        {status === "verifying" && (
          <div>
            <div
              style={{
                width: "48px",
                height: "48px",
                margin: "0 auto 20px",
                border: "4px solid rgba(13, 148, 136, 0.15)",
                borderTopColor: "#0d9488",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <h2 style={{ fontSize: "18px", color: "#0f766e", marginBottom: "8px", fontWeight: 700 }}>
              Verifying Google Account
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Exchanging OpenID Connect security token with API Gateway...
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "#dcfce7",
                color: "#15803d",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: "18px", color: "#15803d", marginBottom: "8px", fontWeight: 700 }}>
              Authentication Successful
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              Redirecting you to your MediCare healthcare dashboard...
            </p>
          </div>
        )}

        {status === "error" && (
          <div>
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "#fee2e2",
                color: "#dc2626",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 18px",
                fontSize: "24px",
                fontWeight: "bold",
              }}
            >
              ✕
            </div>
            <h2 style={{ fontSize: "18px", color: "#991b1b", marginBottom: "8px", fontWeight: 700 }}>
              Authentication Failed
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "#dc2626",
                marginBottom: "20px",
                background: "#fef2f2",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #fecaca",
              }}
            >
              {errorMsg}
            </p>
            <Link
              to="/login"
              style={{
                display: "inline-block",
                padding: "10px 20px",
                background: "#0d9488",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              Back to Login
            </Link>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
