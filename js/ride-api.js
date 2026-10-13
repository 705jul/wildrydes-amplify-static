(function () {
  const config = window.WILD_RYDES_CONFIG;

  async function requestRide(payload) {
    const token = window.WildRydesAuth.getAccessToken();
    if (!token) {
      throw new Error("로그인이 필요합니다.");
    }

    const response = await fetch(`${config.api.baseUrl}/ride`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`API 오류: ${response.status} ${text}`);
    }

    return JSON.parse(text);
  }

  window.WildRydesApi = {
    requestRide
  };
})();

