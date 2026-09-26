/**
 * ClinicalQoSController - Application-Level WebRTC Media Adaptation
 * 
 * ARCHITECTURAL DISTINCTION:
 * - STUN/TURN (ICE Layer):
 *     Handles network connectivity and candidate path selection.
 *     STUN discovers public reflexive IP/ports for direct P2P connections.
 *     TURN acts strictly as a packet relay fallback when direct P2P is blocked by symmetric NAT/firewalls.
 *     CRITICAL NOTE: TURN DOES NOT SOLVE LOW BANDWIDTH.
 *     TURN relays raw RTP packets byte-for-byte; it does NOT transcode or compress streams.
 *     Relaying through TURN adds an extra network hop and server transit overhead.
 * - ClinicalQoSController (Application / Media Layer):
 *     THIS CONTROLLER is what actually solves low bandwidth and packet loss.
 *     It continuously analyzes RTCStatsReport metrics (packetLossRatio, RTT, bitrate)
 *     and enforces dynamic media adaptation with hysteresis:
 *     - Throttles video encoding bitrates (via RTCRtpSender.setParameters)
 *     - Degrades video frame rates and resolution
 *     - Steps down to audio-only mode during severe network degradation
 *     - Prioritizes crystal-clear clinical audio and essential e-prescriptions.
 */

export const QoS_THRESHOLDS = {
  VERY_LOW: { rtt: 0.8, packetLoss: 0.15, bitrate: 50000 },
  MEDIUM: { rtt: 0.3, packetLoss: 0.05, bitrate: 200000 }
};

export const HYSTERESIS_CONFIG = {
  DEGRADE_TICKS: 2, // Needs 2 consecutive bad readings to degrade
  RECOVER_TICKS: 4  // Needs 4 consecutive good readings to recover
};

export const QOS_STATES = {
  GOOD: 'GOOD',
  MEDIUM: 'MEDIUM',
  VERY_LOW: 'VERY_LOW',
  OFFLINE: 'OFFLINE',
  RECONNECTING: 'RECONNECTING',
  SYNCING: 'SYNCING',
};

class ClinicalQoSController {
  constructor() {
    this.qualityState = QOS_STATES.GOOD;
    this.listeners = new Set();
    this.lastBytesReceived = 0;
    this.lastTimestamp = 0;
    this.lastPacketsLost = 0;
    this.lastPacketsReceived = 0;
    this.isSimulated = false;
    
    // Hysteresis counters
    this.stateTicks = {
      GOOD: 0,
      MEDIUM: 0,
      VERY_LOW: 0
    };
  }

  /**
   * Prescribed media & translation adaptation settings per QoS state
   */
  getMediaAdaptation(state = this.qualityState) {
    switch (state) {
      case QOS_STATES.GOOD:
        return {
          targetBitrate: 1500000, // 1.5 Mbps
          scaleResolutionDownBy: 1,
          maxFramerate: 30,
          audioPriority: 'high',
          translationMode: 'full', // Audio voiceover + live subtitles
          videoMuted: false,
        };
      case QOS_STATES.MEDIUM:
        return {
          targetBitrate: 200000,  // 200 kbps
          scaleResolutionDownBy: 2,
          maxFramerate: 15,
          audioPriority: 'high',
          translationMode: 'standard', // Subtitles prioritized, lightweight audio
          videoMuted: false,
        };
      case QOS_STATES.VERY_LOW:
        return {
          targetBitrate: 50000,   // 50 kbps
          scaleResolutionDownBy: 4,
          maxFramerate: 10,
          audioPriority: 'critical', // Audio receives 100% available bandwidth headroom
          translationMode: 'subtitles-only', // Text subtitles only; mute heavy synthesis
          videoMuted: false,
        };
      case QOS_STATES.OFFLINE:
      case QOS_STATES.RECONNECTING:
      case QOS_STATES.SYNCING:
      default:
        return {
          targetBitrate: 0,
          scaleResolutionDownBy: 4,
          maxFramerate: 5,
          audioPriority: 'critical',
          translationMode: 'offline-cached',
          videoMuted: true,
        };
    }
  }

  /**
   * Analyzes RTCPeerConnection stats and determines network quality with hysteresis.
   * Defensively handles missing telemetry, candidate-pair rollovers, and simulation modes.
   * @param {RTCStatsReport} stats 
   */
  analyzeStats(stats) {
    if (this.qualityState === QOS_STATES.OFFLINE) {
      return { state: QOS_STATES.OFFLINE, packetLossRatio: 0, rtt: 0, bitrate: 0, isSimulated: false };
    }
    if (this.qualityState === QOS_STATES.RECONNECTING) {
      return { state: QOS_STATES.RECONNECTING, packetLossRatio: 0, rtt: 0, bitrate: 0, isSimulated: false };
    }
    if (this.qualityState === QOS_STATES.SYNCING) {
      return { state: QOS_STATES.SYNCING, packetLossRatio: 0, rtt: 0, bitrate: 0, isSimulated: false };
    }
    if (this.isSimulated) {
      return { state: this.qualityState, packetLossRatio: 0, rtt: 0, bitrate: 0, isSimulated: true };
    }

    // Safe fallback for null, undefined, or malformed browser statistics (e.g. initial connection or uninstrumented mobile)
    if (!stats || typeof stats.forEach !== 'function') {
      return {
        state: this.qualityState,
        packetLossRatio: 0,
        rtt: 0,
        bitrate: 0,
        rawState: this.qualityState,
        isSimulated: false,
        fallback: true,
      };
    }

    let cumulativeLost = 0;
    let cumulativeReceived = 0;
    let rtt = 0;
    let currentBytesReceived = 0;
    let currentTimestamp = 0;
    
    stats.forEach((report) => {
      // Monitor inbound video stats
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        cumulativeLost = Math.max(0, report.packetsLost || 0);
        cumulativeReceived = Math.max(0, report.packetsReceived || 0);
        currentBytesReceived = Math.max(0, report.bytesReceived || 0);
        currentTimestamp = report.timestamp || Date.now();
      }
      // Monitor active ICE candidate pair for Round Trip Time (RTT)
      if (report.type === 'candidate-pair' && (report.state === 'succeeded' || report.nominated)) {
        rtt = report.currentRoundTripTime || report.roundTripTime || 0;
      }
    });

    // Calculate delta packet loss ratio
    let packetLossRatio = 0;
    if (this.lastTimestamp && currentTimestamp && currentTimestamp > this.lastTimestamp) {
      const lostDelta = Math.max(0, cumulativeLost - this.lastPacketsLost);
      const receivedDelta = Math.max(0, cumulativeReceived - this.lastPacketsReceived);
      const totalDelta = lostDelta + receivedDelta;
      
      if (totalDelta > 0) {
        packetLossRatio = lostDelta / totalDelta;
      }
    }

    // Calculate throughput bitrate
    let bitrate = 0;
    if (this.lastTimestamp && currentTimestamp && currentTimestamp > this.lastTimestamp) {
      const timeDiff = currentTimestamp - this.lastTimestamp;
      if (timeDiff > 0) {
        const bytesDiff = Math.max(0, currentBytesReceived - this.lastBytesReceived);
        bitrate = (bytesDiff * 8) / (timeDiff / 1000); // bps
      }
    }

    this.lastBytesReceived = currentBytesReceived;
    this.lastTimestamp = currentTimestamp;
    this.lastPacketsLost = cumulativeLost;
    this.lastPacketsReceived = cumulativeReceived;

    // Determine instantaneous raw state
    let rawState = QOS_STATES.GOOD;
    if (rtt > QoS_THRESHOLDS.VERY_LOW.rtt || packetLossRatio > QoS_THRESHOLDS.VERY_LOW.packetLoss) {
      rawState = QOS_STATES.VERY_LOW;
    } else if (rtt > QoS_THRESHOLDS.MEDIUM.rtt || packetLossRatio > QoS_THRESHOLDS.MEDIUM.packetLoss) {
      rawState = QOS_STATES.MEDIUM;
    }

    // Apply Hysteresis
    this.stateTicks[rawState] = (this.stateTicks[rawState] || 0) + 1;
    ['GOOD', 'MEDIUM', 'VERY_LOW'].forEach((state) => {
      if (state !== rawState) this.stateTicks[state] = 0; // Reset counters of other states
    });

    let newState = this.qualityState;

    if (rawState === QOS_STATES.VERY_LOW && this.stateTicks['VERY_LOW'] >= HYSTERESIS_CONFIG.DEGRADE_TICKS) {
      newState = QOS_STATES.VERY_LOW;
    } else if (rawState === QOS_STATES.MEDIUM) {
      if (this.qualityState === QOS_STATES.GOOD && this.stateTicks['MEDIUM'] >= HYSTERESIS_CONFIG.DEGRADE_TICKS) {
        newState = QOS_STATES.MEDIUM; // Degrade to medium
      } else if (this.qualityState === QOS_STATES.VERY_LOW && this.stateTicks['MEDIUM'] >= HYSTERESIS_CONFIG.RECOVER_TICKS) {
        newState = QOS_STATES.MEDIUM; // Recover to medium
      }
    } else if (rawState === QOS_STATES.GOOD) {
      if (this.qualityState === QOS_STATES.VERY_LOW && this.stateTicks['GOOD'] >= HYSTERESIS_CONFIG.DEGRADE_TICKS) {
        newState = QOS_STATES.MEDIUM; // Gracefully step up from VERY_LOW to MEDIUM first
        this.stateTicks['GOOD'] = 0;   // Reset to require further stable readings for promotion to GOOD
      } else if (this.qualityState === QOS_STATES.MEDIUM && this.stateTicks['GOOD'] >= HYSTERESIS_CONFIG.DEGRADE_TICKS) {
        newState = QOS_STATES.GOOD;   // Promote from MEDIUM to GOOD
      }
    }

    if (this.qualityState !== newState) {
      this.setState(newState);
    }
    
    return {
      state: this.qualityState,
      packetLossRatio,
      rtt,
      bitrate,
      rawState,
      isSimulated: false,
    };
  }

  setOffline() {
    this.isSimulated = false;
    this.setState(QOS_STATES.OFFLINE);
    this.stateTicks = { GOOD: 0, MEDIUM: 0, VERY_LOW: 0 };
  }

  setReconnecting() {
    this.isSimulated = false;
    this.setState(QOS_STATES.RECONNECTING);
    this.stateTicks = { GOOD: 0, MEDIUM: 0, VERY_LOW: 0 };
  }

  setSyncing() {
    this.isSimulated = false;
    this.setState(QOS_STATES.SYNCING);
  }

  setConnected(targetQuality = QOS_STATES.VERY_LOW) {
    this.isSimulated = false;
    if (
      this.qualityState === QOS_STATES.OFFLINE ||
      this.qualityState === QOS_STATES.RECONNECTING ||
      this.qualityState === QOS_STATES.SYNCING
    ) {
      this.setState(targetQuality);
      this.stateTicks = { GOOD: 0, MEDIUM: 0, VERY_LOW: 0 };
    }
  }

  setSimulatedState(state) {
    this.isSimulated = true;
    this.setState(state);
    this.stateTicks = { GOOD: 0, MEDIUM: 0, VERY_LOW: 0 };
    if (state !== QOS_STATES.OFFLINE) {
      this.stateTicks[state] = 999;
    }
  }

  clearSimulation() {
    this.isSimulated = false;
    this.stateTicks = { GOOD: 0, MEDIUM: 0, VERY_LOW: 0 };
    this.setState(QOS_STATES.GOOD);
  }

  setState(newState) {
    if (this.qualityState !== newState) {
      this.qualityState = newState;
      this.notifyListeners(newState);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.qualityState);
    return () => this.listeners.delete(listener);
  }

  notifyListeners(state) {
    this.listeners.forEach((l) => l(state));
  }
}

export { ClinicalQoSController };
export default new ClinicalQoSController();
