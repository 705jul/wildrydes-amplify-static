(function () {
  const config = window.WILD_RYDES_CONFIG;
  const TOKEN_KEY = "wildrydes_tokens";
  const VERIFIER_KEY = "wildrydes_pkce_verifier";
  const STATE_KEY = "wildrydes_oauth_state";

  function randomString(length = 64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    let result = "";
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    for (let i = 0; i < length; i++) {
      result += chars[randomValues[i] % chars.length];
    }
    return result;
  }

  function base64UrlEncode(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async function sha256(input) {
    const data = new TextEncoder().encode(input);
    return await crypto.subtle.digest("SHA-256", data);
  }

  async function login() {
    const verifier = randomString(96);
    const challenge = base64UrlEncode(await sha256(verifier));
    const state = randomString(32);

    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: config.cognito.clientId,
      redirect_uri: config.cognito.redirectUri,
      scope: "openid email",
      state,
      code_challenge_method: "S256",
      code_challenge: challenge
    });

    const authorizeUrl = `https://${config.cognito.domain}/oauth2/authorize?${params.toString()}`;
    window.location.href = authorizeUrl;
  }

  async function exchangeCodeForToken(code) {
    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) {
      throw new Error("PKCE verifier 가 없습니다.");
    }

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognito.clientId,
      code,
      redirect_uri: config.cognito.redirectUri,
      code_verifier: verifier
    });

    const response = await fetch(`https://${config.cognito.domain}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`토큰 교환 실패: ${response.status} ${text}`);
    }

    const tokens = await response.json();
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    sessionStorage.removeItem(VERIFIER_KEY);
    return tokens;
  }

  async function handleCallback() {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const savedState = sessionStorage.getItem(STATE_KEY);

    if (!code) {
      throw new Error("callback URL에 code 가 없습니다.");
    }

    if (!state || !savedState || state !== savedState) {
      throw new Error("state 검증 실패");
    }

    sessionStorage.removeItem(STATE_KEY);
    await exchangeCodeForToken(code);

    window.location.href = "/ride-request.html";
  }

  function getTokens() {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function getAccessToken() {
    const tokens = getTokens();
    return tokens?.access_token || null;
  }

  function isLoggedIn() {
    return !!getAccessToken();
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    const params = new URLSearchParams({
      client_id: config.cognito.clientId,
      logout_uri: config.cognito.logoutUri
    });
    window.location.href = `https://${config.cognito.domain}/logout?${params.toString()}`;
  }

  window.WildRydesAuth = {
    login,
    logout,
    handleCallback,
    getTokens,
    getAccessToken,
    isLoggedIn
  };
})();

