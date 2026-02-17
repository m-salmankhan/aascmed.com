document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");
  const errorEl = document.getElementById("error-msg");
  const submitBtn = document.getElementById("submit-btn");
  const btnText = document.getElementById("btn-text");
  const btnSpinner = document.getElementById("btn-spinner");

  // Show error if redirected back with ?error
  const params = new URLSearchParams(window.location.search);
  if (params.has("error")) {
    errorEl.classList.remove("d-none");
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    btnSpinner.classList.toggle("d-none", !loading);
    btnText.textContent = loading ? "Signing in…" : "Sign in";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.classList.add("d-none");
    setLoading(true);

    const identifier = form.identifier.value.trim();
    const password = form.password.value;

    if (!identifier || !password) {
      errorEl.classList.remove("d-none");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        errorEl.textContent = (data && data.error) || "Invalid email or password.";
        errorEl.classList.remove("d-none");
      } else if (data && data.redirect) {
        window.location.href = data.redirect;
        return;
      } else {
        const redirect = params.get("redirect") || "/";
        window.location.href = redirect;
        return;
      }
    } catch (err) {
      errorEl.textContent = "Network error — could not reach server.";
      errorEl.classList.remove("d-none");
    } finally {
      setLoading(false);
    }
  });
});
