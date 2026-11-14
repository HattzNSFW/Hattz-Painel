(() => {
  "use strict";
  const API = String(window.HATTZ_SHARE_CONFIG?.apiBase || "https://hattz-share-api.kl-santdev.workers.dev").replace(/\/+$/, "");
  const $ = (id) => document.getElementById(id);
  const tokenKey = "hattz_control_session";
  let token = sessionStorage.getItem(tokenKey) || "";
  let page = 1;
  let totalPages = 1;
  let currentProfiles = [];
  let toastTimer;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function formatBytes(bytes) {
    const n = Math.max(0, Number(bytes) || 0);
    if (n < 1024) return `${n} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = n / 1024, index = 0;
    while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
    return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[index]}`;
  }
  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(Number(value));
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  }
  function notify(message) {
    const el = $("toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
  }
  async function api(path, options = {}, authenticated = true) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (authenticated && token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch(`${API}${path}`, { ...options, headers, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && authenticated) logout(false);
      throw new Error(data.error || `Falha HTTP ${response.status}`);
    }
    return data;
  }
  function showApp(isLogged) {
    $("loginView").hidden = isLogged;
    $("appView").hidden = !isLogged;
    if (isLogged) loadOverview();
  }
  function logout(callApi = true) {
    if (callApi && token) api("/api/admin/auth/logout", { method: "POST", body: "{}" }).catch(() => {});
    token = "";
    sessionStorage.removeItem(tokenKey);
    showApp(false);
  }
  async function login(event) {
    event.preventDefault();
    const button = $("loginForm").querySelector("button");
    button.disabled = true;
    try {
      const result = await api("/api/admin/auth/login", { method: "POST", body: JSON.stringify({ password: $("adminPassword").value }) }, false);
      token = result.token;
      sessionStorage.setItem(tokenKey, token);
      $("adminPassword").value = "";
      showApp(true);
      notify("Acesso autorizado.");
    } catch (error) { notify(error.message); }
    finally { button.disabled = false; }
  }
  function setView(name) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === `view-${name}`));
    document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
    if (name === "profiles") loadProfiles();
    if (name === "storage") loadStorage();
    if (name === "maintenance") loadMaintenance();
    if (name === "ip") loadIp();
    if (name === "audit") loadAudit();
  }
  async function loadOverview() {
    try {
      const [storage, maintenance] = await Promise.all([api("/api/admin/storage"), api("/api/admin/maintenance")]);
      $("apiStatus").textContent = "Operacional";
      $("apiStatus").classList.remove("warning");
      $("overviewMetrics").innerHTML = [
        ["Perfis na nuvem", storage.profileCount, `de ${storage.maxProfiles} permitidos`],
        ["Armazenamento usado", formatBytes(storage.totalBytes), `${storage.usagePercent.toFixed(1)}% da capacidade`],
        ["Espaço disponível", formatBytes(storage.remainingBytes), "capacidade global"],
        ["Perfis adicionais", storage.estimatedAdditionalProfilesByStorage ?? "—", "estimativa pelo consumo médio"]
      ].map(([label, value, hint]) => `<article class="metric glass"><span>${label}</span><strong>${value}</strong><small>${hint}</small></article>`).join("");
      $("overviewStorageBar").style.width = `${storage.usagePercent}%`;
      $("overviewStorageText").textContent = `${formatBytes(storage.totalBytes)} / ${formatBytes(storage.maxBytes)}`;
      $("systemSummary").textContent = `${storage.profileCount} perfis cadastrados · ${storage.remainingProfilesByCount} vagas por limite de quantidade.`;
      $("maintenanceStatus").textContent = maintenance.enabled ? "Ativa" : "Desativada";
      $("maintenanceStatus").classList.toggle("warning", maintenance.enabled);
      $("maintenanceSummary").textContent = maintenance.enabled ? `${maintenance.title}: ${maintenance.message}` : "O acesso público está liberado.";
    } catch (error) { $("apiStatus").textContent = "Falha"; $("apiStatus").classList.add("warning"); notify(error.message); }
  }
  async function loadProfiles() {
    const search = encodeURIComponent($("profileSearch").value.trim());
    try {
      const result = await api(`/api/admin/profiles?page=${page}&limit=25&search=${search}`);
      currentProfiles = result.profiles || [];
      totalPages = Math.max(1, Math.ceil(result.total / result.limit));
      $("profilesTable").innerHTML = currentProfiles.length ? currentProfiles.map((profile) => {
        const official = ["MT7QTEVMZY", "YGZNK6TMG8"].includes(profile.code);
        const status = profile.status || "active";
        return `<tr><td><input type="checkbox" class="profile-check" data-code="${escapeHtml(profile.code)}" ${official ? "disabled" : ""}></td><td><span class="code-cell">${escapeHtml(profile.code)}</span>${official ? '<span class="sub-cell">Perfil oficial · protegido</span>' : ""}</td><td>${formatBytes(profile.storage_bytes)}</td><td>${Number(profile.media_count || 0)}</td><td><span class="state ${escapeHtml(status)}">${status === "active" ? "Ativo" : status === "suspended" ? "Suspenso" : "Excluindo"}</span></td><td>${formatDate(profile.updated_at)}</td></tr>`;
      }).join("") : '<tr><td colspan="6" class="empty">Nenhum perfil encontrado.</td></tr>';
      $("profilesPageLabel").textContent = `Página ${page} de ${totalPages} · ${result.total} perfis`;
      $("previousPage").disabled = page <= 1;
      $("nextPage").disabled = page >= totalPages;
      $("selectAllProfiles").checked = false;
      updateSelection();
    } catch (error) { $("profilesTable").innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`; }
  }
  function selectedCodes() { return [...document.querySelectorAll(".profile-check:checked")].map((input) => input.dataset.code); }
  function updateSelection() {
    const count = selectedCodes().length;
    $("selectionCount").textContent = count ? `${count} perfil(is) selecionado(s)` : "Nenhum perfil selecionado";
    ["suspendSelected", "activateSelected", "deleteSelected"].forEach((id) => $(id).disabled = count === 0);
  }
  async function changeSelectedStatus(status) {
    const codes = selectedCodes();
    if (!codes.length) return;
    const label = status === "suspended" ? "suspender" : "reativar";
    if (!confirm(`Deseja ${label} ${codes.length} perfil(is) selecionado(s)?`)) return;
    try {
      await api("/api/admin/profiles/status", { method: "PATCH", body: JSON.stringify({ codes, status }) });
      notify(`Perfis atualizados: ${codes.length}.`); await loadProfiles();
    } catch (error) { notify(error.message); }
  }
  async function deleteSelected() {
    const codes = selectedCodes();
    if (!codes.length) return;
    const ok = confirm(`ATENÇÃO: excluir permanentemente ${codes.length} perfil(is) e todas as mídias associadas? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    const confirmation = prompt('Para confirmar, digite EXCLUIR:');
    if (confirmation !== "EXCLUIR") { notify("Exclusão cancelada."); return; }
    $("deleteSelected").disabled = true;
    try {
      const result = await api("/api/admin/profiles", { method: "DELETE", body: JSON.stringify({ codes, confirmation }) });
      notify(`${result.deletedCount} perfil(is) excluído(s). ${formatBytes(result.releasedBytes)} liberados.`);
      await Promise.all([loadProfiles(), loadStorage(), loadOverview()]);
    } catch (error) { notify(error.message); await loadProfiles(); }
    finally { updateSelection(); }
  }
  async function loadStorage() {
    try {
      const data = await api("/api/admin/storage");
      $("storageUsed").textContent = formatBytes(data.totalBytes);
      $("storageCapacity").textContent = `de ${formatBytes(data.maxBytes)} disponíveis`;
      $("storagePercent").textContent = `${data.usagePercent.toFixed(1)}%`;
      $("storageBar").style.width = `${data.usagePercent}%`;
      $("storageRemaining").textContent = formatBytes(data.remainingBytes);
      $("storageProfiles").textContent = `${data.profileCount} / ${data.maxProfiles}`;
      $("storageEstimate").textContent = data.estimatedAdditionalProfilesByStorage == null ? "Sem média" : data.estimatedAdditionalProfilesByStorage;
      const largest = data.largestProfiles || [];
      const max = Math.max(1, ...largest.map((x) => Number(x.storage_bytes || 0)));
      $("largestProfiles").innerHTML = largest.length ? largest.map((item) => `<div class="largest-item"><strong>${escapeHtml(item.code)}</strong><div class="bar"><span style="width:${Math.min(100, Number(item.storage_bytes || 0) / max * 100)}%"></span></div><span>${formatBytes(item.storage_bytes)}</span></div>`).join("") : '<p class="empty">Sem dados.</p>';
    } catch (error) { notify(error.message); }
  }
  async function loadMaintenance() {
    try {
      const data = await api("/api/admin/maintenance");
      $("maintenanceEnabled").checked = data.enabled === true;
      $("maintenanceTitle").value = data.title || "Em manutenção";
      $("maintenanceMessage").value = data.message || "Voltamos em breve.";
      $("maintenanceAllowlist").value = (data.allowlist || []).join("\n");
    } catch (error) { notify(error.message); }
  }
  async function saveMaintenance() {
    const allowlist = $("maintenanceAllowlist").value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    try {
      const data = await api("/api/admin/maintenance", { method: "PATCH", body: JSON.stringify({
        enabled: $("maintenanceEnabled").checked,
        title: $("maintenanceTitle").value,
        message: $("maintenanceMessage").value,
        allowlist
      }) });
      notify(data.enabled ? "Modo de manutenção ativado." : "Modo de manutenção desativado.");
      await loadOverview();
    } catch (error) { notify(error.message); }
  }
  async function loadIp() {
    const profile = encodeURIComponent($("ipProfileFilter").value.trim());
    try {
      const data = await api(`/api/admin/ip-events?limit=100${profile ? `&profile=${profile}` : ""}`);
      $("vpnProviderStatus").textContent = "Localização aproximada via Cloudflare. VPN/proxy/Tor só são classificados quando o provedor opcional estiver configurado.";
      $("ipTable").innerHTML = data.events.length ? data.events.map((event) => {
        const location = [event.city, event.region, event.country].filter(Boolean).join(", ") || "—";
        const isp = [event.as_org, event.asn ? `ASN ${event.asn}` : ""].filter(Boolean).join(" · ") || "—";
        const risk = [event.vpn ? "VPN" : "", event.proxy ? "Proxy" : "", event.tor ? "Tor" : ""].filter(Boolean).join(" · ") || "Não detectado / não verificado";
        return `<tr><td><span class="code-cell">${escapeHtml(event.ip || "Criptografado")}</span></td><td>${escapeHtml(event.profile_code || "—")}</td><td>${escapeHtml(location)}</td><td>${escapeHtml(isp)}</td><td>${escapeHtml(risk)}${event.risk_score != null ? `<span class="sub-cell">Risk score ${event.risk_score}</span>` : ""}</td><td>${formatDate(event.created_at)}</td></tr>`;
      }).join("") : '<tr><td colspan="6" class="empty">Nenhum evento encontrado.</td></tr>';
    } catch (error) { $("ipTable").innerHTML = `<tr><td colspan="6" class="empty">${escapeHtml(error.message)}</td></tr>`; }
  }
  async function loadAudit() {
    try {
      const data = await api("/api/admin/audit?limit=100");
      $("auditList").innerHTML = data.events.length ? data.events.map((event) => {
        let details = ""; try { details = JSON.stringify(JSON.parse(event.details_json || "{}")); } catch { details = event.details_json || ""; }
        return `<div class="audit-item"><span class="audit-time">${formatDate(event.created_at)}</span><div><div class="audit-action">${escapeHtml(event.action)}</div><div class="audit-detail">${escapeHtml(details)}</div></div><span class="audit-target">${escapeHtml(event.target || event.actor)}</span></div>`;
      }).join("") : '<p class="empty">Nenhum evento registrado.</p>';
    } catch (error) { $("auditList").innerHTML = `<p class="empty">${escapeHtml(error.message)}</p>`; }
  }

  $("loginForm").addEventListener("submit", login);
  $("logoutButton").addEventListener("click", () => logout(true));
  document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
  document.querySelectorAll("[data-open-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.openView)));
  $("refreshOverview").addEventListener("click", loadOverview);
  $("reloadProfiles").addEventListener("click", () => { page = 1; loadProfiles(); });
  $("searchProfiles").addEventListener("click", () => { page = 1; loadProfiles(); });
  $("profileSearch").addEventListener("keydown", (event) => { if (event.key === "Enter") { page = 1; loadProfiles(); } });
  $("profilesTable").addEventListener("change", (event) => { if (event.target.matches(".profile-check")) updateSelection(); });
  $("selectAllProfiles").addEventListener("change", (event) => { document.querySelectorAll(".profile-check:not(:disabled)").forEach((input) => input.checked = event.target.checked); updateSelection(); });
  $("suspendSelected").addEventListener("click", () => changeSelectedStatus("suspended"));
  $("activateSelected").addEventListener("click", () => changeSelectedStatus("active"));
  $("deleteSelected").addEventListener("click", deleteSelected);
  $("previousPage").addEventListener("click", () => { page = Math.max(1, page - 1); loadProfiles(); });
  $("nextPage").addEventListener("click", () => { page = Math.min(totalPages, page + 1); loadProfiles(); });
  $("reloadStorage").addEventListener("click", loadStorage);
  $("saveMaintenance").addEventListener("click", saveMaintenance);
  $("reloadIp").addEventListener("click", loadIp);
  $("searchIp").addEventListener("click", loadIp);
  $("reloadAudit").addEventListener("click", loadAudit);

  if (token) showApp(true); else showApp(false);
})();