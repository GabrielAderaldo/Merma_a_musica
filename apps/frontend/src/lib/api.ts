const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const res = await fetch(`${API_BASE}${path}`, {
		headers: {
			'Content-Type': 'application/json',
			...options.headers
		},
		...options
	});

	if (!res.ok) {
		const body = await res.json().catch(() => ({ error: res.statusText }));
		throw new Error(body.error || `HTTP ${res.status}`);
	}

	return res.json();
}

function authHeaders(token: string): HeadersInit {
	return { Authorization: `Bearer ${token}` };
}

// --- Rooms ---

export async function createRoom(hostId: string, hostName: string, config: Record<string, unknown> = {}) {
	return request<{ invite_code: string; host_id: string }>('/rooms', {
		method: 'POST',
		body: JSON.stringify({ host_id: hostId, host_name: hostName, config })
	});
}

export async function getRoom(code: string) {
	return request<{ invite_code: string; host_id: string; status: string; players: unknown[] }>(
		`/rooms/${code}`
	);
}

// --- Auth ---

export async function getAuthUrl(platform: string, state = '') {
	return request<{ url: string }>(`/auth/${platform}?state=${encodeURIComponent(state)}`);
}

export async function exchangeCode(platform: string, code: string) {
	return request<{ access_token: string }>(`/auth/${platform}/callback`, {
		method: 'POST',
		body: JSON.stringify({ code })
	});
}

// --- Playlists ---

export async function getPlaylists(platform: string, accessToken: string) {
	return request<{ playlists: { id: string; name: string; total: number }[] }>(
		`/playlists/${platform}`,
		{ headers: authHeaders(accessToken) }
	);
}

export async function getPlaylistSongs(platform: string, playlistId: string, accessToken: string) {
	return request<{ songs: { id: string; name: string; artist: string; preview_url: string }[]; total: number }>(
		`/playlists/${platform}/${playlistId}/songs`,
		{ headers: authHeaders(accessToken) }
	);
}

export async function getPlatforms() {
	return request<{ platforms: string[] }>('/platforms');
}
