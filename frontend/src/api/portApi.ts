export const API_URL = "http://localhost:3000";

export async function fetchConfig() {
    const res = await fetch(`${API_URL}/config`);
    return await res.json();
}

export async function saveConfig(config: any) {
    const res = await fetch(`${API_URL}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
    });
    return await res.json();
}