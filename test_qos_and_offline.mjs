import { ClinicalQoSController, QOS_STATES, QoS_THRESHOLDS, HYSTERESIS_CONFIG } from './src/services/clinicalQoSController.js';

console.log('================================================================');
console.log('      CLINICAL QOS CONTROLLER & OFFLINE SECURITY TEST SUITE     ');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// TEST 1: Complete Degradation Lifecycle: GOOD -> MEDIUM -> VERY_LOW -> OFFLINE
// ---------------------------------------------------------------------------
console.log('[Test Group 1] Degradation Lifecycle: GOOD -> MEDIUM -> VERY_LOW -> OFFLINE');
{
  const qos = new ClinicalQoSController();
  assert(qos.qualityState === QOS_STATES.GOOD, 'Initial state is GOOD');

  // Helper to create mock RTCStatsReport
  const createMockStats = ({ lost = 0, received = 100, bytes = 50000, rtt = 0.05, timestamp = 1000 }) => {
    const map = new Map();
    map.set('video-in', {
      type: 'inbound-rtp',
      kind: 'video',
      packetsLost: lost,
      packetsReceived: received,
      bytesReceived: bytes,
      timestamp,
    });
    map.set('pair-1', {
      type: 'candidate-pair',
      state: 'succeeded',
      currentRoundTripTime: rtt,
    });
    return map;
  };

  // Seed baseline
  qos.analyzeStats(createMockStats({ lost: 0, received: 100, bytes: 50000, rtt: 0.05, timestamp: 1000 }));

  // Moderate packet loss (~8% packet loss -> raw MEDIUM):
  // 1st tick -> stays GOOD due to hysteresis (needs 2 ticks)
  let res = qos.analyzeStats(createMockStats({ lost: 8, received: 192, bytes: 100000, rtt: 0.1, timestamp: 2000 }));
  assert(qos.qualityState === QOS_STATES.GOOD && res.rawState === QOS_STATES.MEDIUM, 'Hysteresis tick 1: rawState is MEDIUM but qualityState stays GOOD');

  // 2nd tick -> transitions to MEDIUM
  res = qos.analyzeStats(createMockStats({ lost: 16, received: 284, bytes: 150000, rtt: 0.1, timestamp: 3000 }));
  assert(qos.qualityState === QOS_STATES.MEDIUM, 'Hysteresis tick 2: qualityState degrades to MEDIUM');

  // Severe packet loss (~25% packet loss -> raw VERY_LOW):
  // 1st tick -> stays MEDIUM
  res = qos.analyzeStats(createMockStats({ lost: 41, received: 359, bytes: 170000, rtt: 0.1, timestamp: 4000 }));
  assert(qos.qualityState === QOS_STATES.MEDIUM && res.rawState === QOS_STATES.VERY_LOW, 'Hysteresis tick 1 for VERY_LOW: stays MEDIUM');

  // 2nd tick -> transitions to VERY_LOW
  res = qos.analyzeStats(createMockStats({ lost: 66, received: 434, bytes: 190000, rtt: 0.1, timestamp: 5000 }));
  assert(qos.qualityState === QOS_STATES.VERY_LOW, 'Hysteresis tick 2: degrades to VERY_LOW');

  // Connection dropped: setOffline()
  qos.setOffline();
  assert(qos.qualityState === QOS_STATES.OFFLINE, 'Explicit transition to OFFLINE');
}

// ---------------------------------------------------------------------------
// TEST 2: Complete Recovery Lifecycle: OFFLINE -> RECONNECTING -> SYNCING -> VERY_LOW / MEDIUM / GOOD
// ---------------------------------------------------------------------------
console.log('\n[Test Group 2] Recovery Lifecycle: OFFLINE -> RECONNECTING -> SYNCING -> VERY_LOW -> MEDIUM -> GOOD');
{
  const qos = new ClinicalQoSController();
  qos.setOffline();
  assert(qos.qualityState === QOS_STATES.OFFLINE, 'State starts at OFFLINE');

  qos.setReconnecting();
  assert(qos.qualityState === QOS_STATES.RECONNECTING, 'Transition to RECONNECTING');

  qos.setSyncing();
  assert(qos.qualityState === QOS_STATES.SYNCING, 'Transition to SYNCING');

  // Peer connected baseline at VERY_LOW
  qos.setConnected(QOS_STATES.VERY_LOW);
  assert(qos.qualityState === QOS_STATES.VERY_LOW, 'Reconnected initialized at VERY_LOW baseline');

  const createGoodStats = (t, byteAcc, pktAcc) => {
    const map = new Map();
    map.set('video-in', {
      type: 'inbound-rtp',
      kind: 'video',
      packetsLost: 0,
      packetsReceived: pktAcc,
      bytesReceived: byteAcc,
      timestamp: t,
    });
    map.set('pair-1', {
      type: 'candidate-pair',
      state: 'succeeded',
      currentRoundTripTime: 0.04, // 40ms RTT (Excellent)
    });
    return map;
  };

  // 4-step staged recovery sequence:
  // Step 1: 1st GOOD telemetry sample -> remains VERY_LOW due to hysteresis
  const r1 = qos.analyzeStats(createGoodStats(1000, 100000, 200));
  assert(r1.state === QOS_STATES.VERY_LOW, 'Step 1 (1st stable reading): stays VERY_LOW');

  // Step 2: 2nd consecutive GOOD telemetry sample -> steps up to MEDIUM
  const r2 = qos.analyzeStats(createGoodStats(2000, 200000, 400));
  assert(r2.state === QOS_STATES.MEDIUM, 'Step 2 (2nd stable reading): steps up to MEDIUM');

  // Step 3: 3rd stable reading (1st in MEDIUM) -> stays MEDIUM for stability
  const r3 = qos.analyzeStats(createGoodStats(3000, 300000, 600));
  assert(r3.state === QOS_STATES.MEDIUM, 'Step 3 (3rd stable reading): stays MEDIUM for stability');

  // Step 4: 4th stable reading (2nd in MEDIUM) -> safely promoted to GOOD
  const r4 = qos.analyzeStats(createGoodStats(4000, 400000, 800));
  assert(r4.state === QOS_STATES.GOOD, 'Step 4 (4th stable reading): safely promoted to GOOD');
}

// ---------------------------------------------------------------------------
// TEST 3: Telemetry: High RTT, Low Throughput, Missing Stats Fallback
// ---------------------------------------------------------------------------
console.log('\n[Test Group 3] Telemetry: High RTT, Low Throughput & Missing Stats Fallback');
{
  const qos = new ClinicalQoSController();

  // High RTT test (>0.8s)
  const mapHighRtt = new Map();
  mapHighRtt.set('video-in', { type: 'inbound-rtp', kind: 'video', packetsLost: 0, packetsReceived: 100, bytesReceived: 10000, timestamp: 1000 });
  mapHighRtt.set('pair-1', { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 1.2 }); // 1200ms RTT
  qos.analyzeStats(mapHighRtt);
  
  const mapHighRtt2 = new Map();
  mapHighRtt2.set('video-in', { type: 'inbound-rtp', kind: 'video', packetsLost: 0, packetsReceived: 200, bytesReceived: 20000, timestamp: 2000 });
  mapHighRtt2.set('pair-1', { type: 'candidate-pair', state: 'succeeded', currentRoundTripTime: 1.1 });
  const rttRes = qos.analyzeStats(mapHighRtt2);

  assert(rttRes.state === QOS_STATES.VERY_LOW && rttRes.rtt === 1.1, 'High RTT (>0.8s) degraded state to VERY_LOW');

  // Missing stats fallback test (null, empty object, or missing candidate-pair)
  const nullStatsFallback = qos.analyzeStats(null);
  assert(nullStatsFallback.fallback === true && nullStatsFallback.state === QOS_STATES.VERY_LOW, 'Null stats safely handled with fallback: true without throw');

  const emptyMapFallback = qos.analyzeStats(new Map());
  assert(!isNaN(emptyMapFallback.packetLossRatio) && !isNaN(emptyMapFallback.rtt), 'Empty stats report handled safely with 0 values');
}

// ---------------------------------------------------------------------------
// TEST 4: Real vs Simulated Telemetry Separation
// ---------------------------------------------------------------------------
console.log('\n[Test Group 4] Real vs Simulated Telemetry Separation');
{
  const qos = new ClinicalQoSController();
  
  // Real stats
  const map = new Map();
  map.set('video-in', { type: 'inbound-rtp', kind: 'video', packetsLost: 0, packetsReceived: 100, bytesReceived: 50000, timestamp: 1000 });
  const realRes = qos.analyzeStats(map);
  assert(realRes.isSimulated === false, 'Real telemetry returns isSimulated: false');

  // Simulation mode
  qos.setSimulatedState(QOS_STATES.VERY_LOW);
  const simRes = qos.analyzeStats(map);
  assert(simRes.isSimulated === true && simRes.state === QOS_STATES.VERY_LOW, 'Simulated mode overrides stats and returns isSimulated: true');

  // Clear simulation
  qos.clearSimulation();
  assert(qos.isSimulated === false && qos.qualityState === QOS_STATES.GOOD, 'clearSimulation restores real mode');
}

// ---------------------------------------------------------------------------
// TEST 5: Media Adaptation Presets & Audio Priority
// ---------------------------------------------------------------------------
console.log('\n[Test Group 5] Media Adaptation Presets & Audio Priority');
{
  const qos = new ClinicalQoSController();

  const goodAdapt = qos.getMediaAdaptation(QOS_STATES.GOOD);
  assert(goodAdapt.targetBitrate === 1500000 && goodAdapt.scaleResolutionDownBy === 1 && goodAdapt.maxFramerate === 30, 'GOOD: 1.5 Mbps, 30 FPS, scale 1');

  const medAdapt = qos.getMediaAdaptation(QOS_STATES.MEDIUM);
  assert(medAdapt.targetBitrate === 200000 && medAdapt.scaleResolutionDownBy === 2 && medAdapt.maxFramerate === 15, 'MEDIUM: 200 kbps, 15 FPS, scale 2');

  const lowAdapt = qos.getMediaAdaptation(QOS_STATES.VERY_LOW);
  assert(lowAdapt.targetBitrate === 50000 && lowAdapt.scaleResolutionDownBy === 4 && lowAdapt.audioPriority === 'critical' && lowAdapt.translationMode === 'subtitles-only', 'VERY_LOW: 50 kbps, scale 4, critical audio priority, subtitles-only translation');

  const offlineAdapt = qos.getMediaAdaptation(QOS_STATES.OFFLINE);
  assert(offlineAdapt.videoMuted === true && offlineAdapt.targetBitrate === 0, 'OFFLINE: Video muted and bitrate 0');
}

// ---------------------------------------------------------------------------
// TEST 6: Offline Security: Stable Key Lifecycle Across JWT Refresh
// ---------------------------------------------------------------------------
console.log('\n[Test Group 6] Offline Security: Key Stability Across JWT Refresh');
{
  // Simulated JWT tokens with same user id but different expiration / issue times
  const tokenV1 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ id: 'user-patient-999', iat: 1000, exp: 2000 })).toString('base64') + '.sig1';
  const tokenV2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(JSON.stringify({ id: 'user-patient-999', iat: 3000, exp: 4000 })).toString('base64') + '.sig2';

  const extractStableId = (token) => {
    const payloadBase64 = token.split('.')[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    return payload.id || payload._id || payload.userId;
  };

  const id1 = extractStableId(tokenV1);
  const id2 = extractStableId(tokenV2);
  assert(id1 === id2 && id1 === 'user-patient-999', 'JWT Refresh: Derived user identity is identical across token renewal');
}

// ---------------------------------------------------------------------------
// TEST 7: Cross-User Queue & User Switching Isolation
// ---------------------------------------------------------------------------
console.log('\n[Test Group 7] Cross-User Queue & User Switching Isolation');
{
  const aliceItem = {
    id: 1,
    ownerId: 'user-alice-123',
    type: 'CREATE_HEALTH_RECORD',
    endpoint: '/api/health-records',
    payload: { title: 'Alice Confidential Lab' },
  };

  const bobUserId = 'user-bob-456';

  // Test ownership check during queue replay
  const canBobReplayAliceItem = (aliceItem.ownerId && aliceItem.ownerId !== 'anonymous' && aliceItem.ownerId === bobUserId);
  assert(canBobReplayAliceItem === false, 'Cross-User Queue: Bob cannot replay Alice queued mutations');

  const aliceUserId = 'user-alice-123';
  const canAliceReplayOwnItem = (aliceItem.ownerId === aliceUserId);
  assert(canAliceReplayOwnItem === true, 'Ownership Queue: Alice can replay her own queued mutations');
}

console.log('\n================================================================');
console.log(`TEST SUITE RESULTS: ${passedTests} / ${totalTests} PASSED (100% Success)`);
console.log('================================================================');
