const API = "https://healthlens-ru2h.onrender.com/api";

async function request(path, options = {}) {
  const token = localStorage.getItem("healthlens_token");
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Request failed.");
  return data;
}

export const api = {
  register: body => request("/auth/register", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }),
  login: body => request("/auth/login", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(body) }),
  demoLogin: () => request("/auth/demo", { method: "POST" }),
  me: () => request("/auth/me"),
  deleteAccount: () => request("/auth/account", { method: "DELETE" }),
  reports: () => request("/reports"),
  report: id => request(`/reports/${id}`),
  medicalTerm: (term, status = "within") => request(`/medical-term?term=${encodeURIComponent(term)}&status=${encodeURIComponent(status)}`),
  deleteReport: id => request(`/reports/${id}`, { method: "DELETE" }),
  demoReport: () => request("/reports/demo", { method: "POST" }),
  upload: file => {
    const form = new FormData();
    form.append("report", file);
    return request("/reports/upload", { method: "POST", body: form });
  }
};
