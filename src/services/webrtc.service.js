/**
 * WebRTC ICE & Connectivity Management Service
 * 
 * ARCHITECTURAL DISTINCTION:
 * 1. STUN/TURN (ICE Layer / Connectivity & Path Selection):
 *    - STUN enables NAT traversal for direct Peer-to-Peer (P2P) connections.
 *    - TURN provides a packet relay fallback ONLY when direct P2P connection fails (e.g. symmetric NAT or restrictive firewall).
 *    - IMPORTANT: TURN DOES NOT SOLVE LOW BANDWIDTH.
 *      TURN servers relay bitstreams byte-for-byte; they do not compress, transcode, or optimize video.
 *      Relaying through TURN actually adds latency (an extra network hop) and consumes server bandwidth.
 * 2. ClinicalQoSController (Application Layer / Media Adaptation):
 *    - Purely handles media adaptation for unstable and low-bandwidth connections.
 *    - Dynamically modulates RTCRtpSender encoding parameters, degrades video resolution/framerate,
 *      and prioritizes crystal-clear audio during consultations.
 *
 * CREDENTIAL SECURITY:
 * - Permanent TURN admin credentials are NEVER stored or bundled in the frontend.
 * - Authenticated, short-lived ephemeral credentials are provided dynamically by the backend (GET /api/webrtc/ice-servers).
 * - Direct peer-to-peer communication is prioritized by setting iceTransportPolicy to 'all'.
 */

import { apiRequest } from '../utils/httpClient';
import { getDefaultIceServers } from '../config/env';

export { getDefaultIceServers };

/**
 * Fetch production-safe, short-lived WebRTC ICE & TURN configuration from backend.
 * Falls back to default public STUN servers if offline or unreachable.
 * @returns {Promise<RTCConfiguration>}
 */
export async function fetchIceServers() {
  try {
    const res = await apiRequest('/webrtc/ice-servers', { method: 'GET' });
    if (res && res.success && res.data) {
      console.log('[WebRTC] Acquired authenticated ICE configuration from backend (Servers:', res.data.iceServers?.length, ')');
      return res.data;
    }
    if (res && res.iceServers) {
      return res;
    }
  } catch (err) {
    console.warn('[WebRTC] Ephemeral TURN credential fetch failed, falling back to public STUN:', err.message);
  }

  // Fallback to STUN for direct P2P connectivity
  return getDefaultIceServers();
}

export default {
  fetchIceServers,
  getDefaultIceServers,
};
